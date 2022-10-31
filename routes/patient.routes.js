const router = require("express").Router();

const mongoose = require("mongoose");

const Patient = require("../models/Patient.model");
const User = require("../models/User.model");

// Require necessary (isAuthenticated) middleware in order to control access to specific routes
const { isAuthenticated } = require("../middleware/jwt.middleware.js");
const { isPatientOwner } = require("../middleware/isPatientOwner.middleware");

// GET /api/patients  -  Get list of patients
router.get("/patients", isAuthenticated, (req, res, next) => {
  Patient.find({ therapist: req.payload._id })
    .populate("therapist")
    .then((allPatients) => {
      res.json(allPatients);
    })
    .catch((err) => {
      console.log("error getting list of patients...", err);
      res.status(500).json({
        message: "error getting list of patients",
        error: err,
      });
    });
});

// GET /api/patients/:patientId -  Retrieves a specific patient by id
router.get(
  "/patients/:patientId",
  isAuthenticated,
  isPatientOwner,
  (req, res, next) => {
    const { patientId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(patientId)) {
      res.status(400).json({ message: "Specified id is not valid" });
      return;
    }

    Patient.findById(patientId)
      .populate("therapist")
      .then((patient) => res.json(patient))
      .catch((err) => {
        console.log("error getting patient details...", err);
        res.status(500).json({
          message: "error getting patient details...",
          error: err,
        });
      });
  }
);

// PUT  /api/patients/:patientId  -  Updates a specific patient by id
router.put(
  "/patients/:patientId",
  isAuthenticated,
  isPatientOwner,
  (req, res, next) => {
    const { patientId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(patientId)) {
      res.status(400).json({ message: "Specified id is not valid" });
      return;
    }

    const { email, phone } = req.body;
    Patient.findOne({
      $or: [{ email }, { phone }],
    })
      .then((foundPatient) => {
        // If a patient with the same email or phone number already exists, send an error response
        if (foundPatient) {
          const errorMessage =
            foundPatient.email === email
              ? "Email already in use."
              : "Phone number already in use.";
          res.status(400).json({ message: errorMessage });
          return;
        }
        return Patient.findByIdAndUpdate(patientId, req.body, { new: true });
      })
      .then((updatedPatient) => res.json(updatedPatient))
      .catch((err) => {
        console.log("error updating patient...", err);
        res.status(500).json({
          message: "error updating patient...",
          error: err,
        });
      });
  }
);

// POST /api/patients  -  Creates a new patient
router.post("/patients", isAuthenticated, (req, res, next) => {
  const { name, surname, dateOfBirth, email, phone, diagnoses, medications } = req.body;

  const therapist = req.payload._id;
  const newPatient = {
    name,
    surname,
    dateOfBirth,
    email,
    phone,
    diagnoses,
    medications,
    therapist,
  };

  Patient.findOne({
    $or: [{ email }, { phone }],
  })
    .then((foundPatient) => {
      // If a patient with the same email or phone number already exists, send an error response
      if (foundPatient) {
        const errorMessage =
          foundPatient.email === email
            ? "Email already in use."
            : "Phone number already in use.";
        res.status(400).json({ message: errorMessage });
        return;
      }
      return Patient.create(newPatient);
    })
    .then((response) => res.json(response))
    .catch((err) => {
      res.status(500).json({
        message: "error creating a new patient",
        error: err,
      });
    });
});

module.exports = router;
