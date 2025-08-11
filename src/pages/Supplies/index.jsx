import React, { useState, useEffect } from 'react';
import { Package, Calculator, ChevronDown, Check, AlertCircle, Info, ChevronUp } from 'lucide-react';
import { firestore } from '../../config/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import './Supplies.css';

const Supplies = () => {
  // Input states
  const [mgPerDose, setMgPerDose] = useState('');
  const [dosesPerMonth, setDosesPerMonth] = useState('');
  const [sprxQuantity, setSprxQuantity] = useState('');
  const [volumeToInfuse, setVolumeToInfuse] = useState('');
  const [gravityInfusion, setGravityInfusion] = useState('No');
  const [ivSuppliesType, setIvSuppliesType] = useState('PORT SUPPLIES');
  const [adrPremedsRequired, setAdrPremedsRequired] = useState('NO');
  const [selectedMedication, setSelectedMedication] = useState(null);
  const [showCalculationDetails, setShowCalculationDetails] = useState(false);
  const [sterileWaterVialSize, setSterileWaterVialSize] = useState('10');
  
  // Additional medication-specific inputs
  const [unitsPerDose, setUnitsPerDose] = useState(''); // For Cerezyme, Elelyso
  const [numberOfVials, setNumberOfVials] = useState(''); // For Lumizyme, Vpriv
  const [number5mgVials, setNumber5mgVials] = useState(''); // For Fabrazyme
  const [number35mgVials, setNumber35mgVials] = useState(''); // For Fabrazyme
  const [isHomeInfusion, setIsHomeInfusion] = useState('NO'); // For Naglazyme, Vimizim
  
  // Results state
  const [calculatedSupplies, setCalculatedSupplies] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [calculationLog, setCalculationLog] = useState([]);
  const [checkedRows, setCheckedRows] = useState(new Set());
  const [isCompactView, setIsCompactView] = useState(false);
  const [showInfusionGuide, setShowInfusionGuide] = useState(false);
  const [showPIVInfo, setShowPIVInfo] = useState(false);
  const [showPICInfo, setShowPICInfo] = useState(false);
  const [showPORTInfo, setShowPORTInfo] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');  // For showing error messages

  // Supply data structure
  const suppliesData = {
    medications: {
      ALDURAZYME: {
        name: "ALDURAZYME",
        color: "#ff5500",
        inputType: "mg",
        base_supplies: [
          { name: "TUBING 92\" CURLIN NO/DEHP", irc: "36282", qty: "doses_per_month" },
          { name: "IV EXT .22 MICR FILT 10\"", irc: "38258", qty: "doses_per_month", note: "CONSULT RPH IF DIFFERENT FILTER NEEDED" },
          { name: "SYRINGE 50-60ML L/L NO NEEDLE", irc: "24288", qty: "doses_per_month", note: "Selection depending on patient/nurse preference" },
          { name: "SYRINGE 10ML L/L NO NDL", irc: "43637", qty: "doses_per_month" },
          { name: "SYRINGE 20ML L/L NO NDL", irc: "36842", qty: "doses_per_month" },
          { name: "SYRINGE 30ML L/L NO NDL", irc: "37100", qty: "doses_per_month" },
          { name: "NEEDLE 18G X 1\" HYPO", irc: "52210", qty: "doses_per_month" },
          { name: "NEEDLE 20G X 1\"", irc: "39767", qty: "doses_per_month" },
          { name: "SYRINGE 10CC 21G 1\" L/L (with needle)", irc: "17217", qty: "doses_per_month" },
          { name: "SYRINGE 10ML 20G 1\" L/L #9644 (with needle)", irc: "8248", qty: "doses_per_month" }
        ]
      },
      CEREZYME: {
        name: "CEREZYME",
        color: "#ff5500",
        inputType: "units",
        base_supplies: [
          { name: "TUBING 92\" CURLIN NO/DEHP", irc: "36282", qty: "doses_per_month" },
          { name: "IV EXT .22 MICR FILT 10\"", irc: "38258", qty: "doses_per_month", note: "CONSULT RPH IF DIFFERENT FILTER NEEDED" },
          { name: "SYRINGE 50-60ML L/L NO NEEDLE", irc: "24288", qty: "doses_per_month", note: "Selection depending on patient/nurse preference" },
          { name: "NEEDLE 18G X 1\" HYPO", irc: "52210", qty: "doses_per_month" },
          { name: "NEEDLE 20G X 1\"", irc: "39767", qty: "doses_per_month" },
          { name: "SYRINGE 10ML L/L NO NDL", irc: "43637", qty: "doses_per_month" },
          { name: "SYRINGE 20ML L/L NO NDL", irc: "36842", qty: "doses_per_month" },
          { name: "SYRINGE 30ML L/L NO NDL", irc: "37100", qty: "doses_per_month" },
          { name: "SYRINGE 10CC 21G 1\" L/L (with needle)", irc: "17217", qty: "doses_per_month" },
          { name: "SYRINGE 10ML 20G 1\" L/L #9644 (with needle)", irc: "8248", qty: "doses_per_month" }
        ],
        sterile_water_per_vial: 10.2,
        vial_size: 400
      },
      ELAPRASE: {
        name: "ELAPRASE",
        color: "#ff5500",
        inputType: "mg",
        base_supplies: [
          { name: "TUBING 92\" CURLIN NO/DEHP", irc: "36282", qty: "doses_per_month" },
          { name: "IV EXT SET 7\" 0.2 MICRON FILT", irc: "34258", qty: "doses_per_month", note: "MANUFACTURER RECOMMENDED - DO NOT SUBSTITUTE!" },
          { name: "AMBER 5\" X 8\" 3MIL BAGS ++", irc: "17458", qty: "doses_per_month" },
          { name: "SYRINGE 10ML L/L NO NDL", irc: "43637", qty: "doses_per_month", note: "Selection depending on patient/nurse preference" },
          { name: "SYRINGE 20ML L/L NO NDL", irc: "36842", qty: "doses_per_month" },
          { name: "SYRINGE 30ML L/L NO NDL", irc: "37100", qty: "doses_per_month" },
          { name: "SYRINGE 50-60ML L/L NO NEEDLE", irc: "24288", qty: "doses_per_month" },
          { name: "NEEDLE 18G X 1\" HYPO", irc: "52210", qty: "doses_per_month" },
          { name: "NEEDLE 20G X 1\"", irc: "39767", qty: "doses_per_month" },
          { name: "SYRINGE 10CC 21G 1\" L/L (with needle)", irc: "17217", qty: "doses_per_month" },
          { name: "SYRINGE 10ML 20G 1\" L/L #9644 (with needle)", irc: "8248", qty: "doses_per_month" }
        ]
      },
      ELELYSO: {
        name: "ELELYSO",
        color: "#ff5500",
        inputType: "units",
        base_supplies: [
          { name: "TUBING 92\" CURLIN NO/DEHP", irc: "36282", qty: "doses_per_month" },
          { name: "IV EXT SET 7\" 0.2 MICRON FILT", irc: "34258", qty: "doses_per_month", note: "CONSULT RPH IF DIFFERENT FILTER NEEDED" },
          { name: "SYRINGE 10ML L/L NO NDL", irc: "43637", qty: "doses_per_month", note: "Selection depending on patient/nurse preference" },
          { name: "SYRINGE 20ML L/L NO NDL", irc: "36842", qty: "doses_per_month" },
          { name: "SYRINGE 30ML L/L NO NDL", irc: "37100", qty: "doses_per_month" },
          { name: "SYRINGE 50-60ML L/L NO NEEDLE", irc: "24288", qty: "doses_per_month" },
          { name: "NEEDLE 18G X 1\" HYPO", irc: "52210", qty: "doses_per_month" },
          { name: "NEEDLE 20G X 1\"", irc: "39767", qty: "doses_per_month" },
          { name: "SYRINGE 10CC 21G 1\" L/L (with needle)", irc: "17217", qty: "doses_per_month" },
          { name: "SYRINGE 10ML 20G 1\" L/L #9644 (with needle)", irc: "8248", qty: "doses_per_month" }
        ],
        sterile_water_per_vial: 5.1,
        vial_size: 200
      },
      FABRAZYME: {
        name: "FABRAZYME",
        color: "#ff5500",
        inputType: "mg_with_vials",
        base_supplies: [
          { name: "TUBING 92\" CURLIN NO/DEHP", irc: "36282", qty: "doses_per_month" },
          { name: "IV EXT .22 MICR FILT 10\"", irc: "38258", qty: "doses_per_month", note: "CONSULT RPH IF DIFFERENT FILTER NEEDED" },
          { name: "SYRINGE 10ML L/L NO NDL", irc: "43637", qty: "doses_per_month", note: "Selection depending on patient/nurse preference" },
          { name: "SYRINGE 20ML L/L NO NDL", irc: "36842", qty: "doses_per_month" },
          { name: "SYRINGE 30ML L/L NO NDL", irc: "37100", qty: "doses_per_month" },
          { name: "SYRINGE 50-60ML L/L NO NEEDLE", irc: "24288", qty: "doses_per_month" },
          { name: "NEEDLE 18G X 1\" HYPO", irc: "52210", qty: "doses_per_month" },
          { name: "NEEDLE 20G X 1\"", irc: "39767", qty: "doses_per_month" },
          { name: "SYRINGE 10CC 21G 1\" L/L (with needle)", irc: "17217", qty: "doses_per_month" },
          { name: "SYRINGE 10ML 20G 1\" L/L #9644 (with needle)", irc: "8248", qty: "doses_per_month" }
        ],
        vial_sizes: [5, 35],
        sterile_water_5mg: 1.1,
        sterile_water_35mg: 7.2
      },
      KANUMA: {
        name: "KANUMA",
        color: "#ff5500",
        inputType: "mg",
        base_supplies: [
          { name: "TUBING 92\" CURLIN NO/DEHP", irc: "36282", qty: "doses_per_month" },
          { name: "FILTERSET 0.2MICRON BAXTER", irc: "34857", qty: "doses_per_month", note: "CONSULT RPH IF DIFFERENT FILTER NEEDED" },
          { name: "AMBER 5\" X 8\" 3MIL BAGS ++", irc: "17458", qty: "doses_per_month", note: "Per Nurse request only" },
          { name: "SYRINGE 10ML L/L NO NDL", irc: "43637", qty: "doses_per_month", note: "Selection depending on patient/nurse preference" },
          { name: "SYRINGE 20ML L/L NO NDL", irc: "36842", qty: "doses_per_month" },
          { name: "SYRINGE 30ML L/L NO NDL", irc: "37100", qty: "doses_per_month" },
          { name: "SYRINGE 50-60ML L/L NO NEEDLE", irc: "24288", qty: "doses_per_month" },
          { name: "NEEDLE 18G X 1\" HYPO", irc: "52210", qty: "doses_per_month" },
          { name: "NEEDLE 20G X 1\"", irc: "39767", qty: "doses_per_month" },
          { name: "SYRINGE 10CC 21G 1\" L/L (with needle)", irc: "17217", qty: "doses_per_month" },
          { name: "SYRINGE 10ML 20G 1\" L/L #9644 (with needle)", irc: "8248", qty: "doses_per_month" }
        ]
      },
      LUMIZYME: {
        name: "LUMIZYME",
        color: "#ff5500",
        inputType: "mg_with_vials",
        base_supplies: [
          { name: "TUBING 92\" CURLIN NO/DEHP", irc: "36282", qty: "doses_per_month" },
          { name: "FILTERSET 0.2MICRON BAXTER", irc: "34857", qty: "doses_per_month", note: "MANUFACTURER RECOMMENDED - DO NOT SUBSTITUTE!" },
          { name: "AMBER 5\" X 8\" 3MIL BAGS ++", irc: "17458", qty: "doses_per_month", note: "Selection depending on patient/nurse preference" },
          { name: "SYRINGE 10ML L/L NO NDL", irc: "43637", qty: "doses_per_month" },
          { name: "SYRINGE 20ML L/L NO NDL", irc: "36842", qty: "doses_per_month" },
          { name: "SYRINGE 30ML L/L NO NDL", irc: "37100", qty: "doses_per_month" },
          { name: "SYRINGE 50-60ML L/L NO NEEDLE", irc: "24288", qty: "doses_per_month" },
          { name: "NEEDLE 18G X 1\" HYPO", irc: "52210", qty: "doses_per_month" },
          { name: "NEEDLE 20G X 1\"", irc: "39767", qty: "doses_per_month" },
          { name: "SYRINGE 10CC 21G 1\" L/L (with needle)", irc: "17217", qty: "doses_per_month" },
          { name: "SYRINGE 10ML 20G 1\" L/L #9644 (with needle)", irc: "8248", qty: "doses_per_month" }
        ],
        sterile_water_per_vial: 10.3,
        vial_size: 50
      },
      NAGLAZYME: {
        name: "NAGLAZYME",
        color: "#ff5500",
        inputType: "mg",
        base_supplies: [
          { name: "TUBING 92\" CURLIN NO/DEHP", irc: "36282", qty: "doses_per_month" },
          { name: "IV EXT .22 MICR FILT 10\"", irc: "38258", qty: "doses_per_month", note: "CONSULT RPH IF DIFFERENT FILTER NEEDED" },
          { name: "SYRINGE 10ML L/L NO NDL", irc: "43637", qty: "doses_per_month", note: "Selection depending on patient/nurse preference" },
          { name: "SYRINGE 20ML L/L NO NDL", irc: "36842", qty: "doses_per_month" },
          { name: "SYRINGE 30ML L/L NO NDL", irc: "37100", qty: "doses_per_month" },
          { name: "SYRINGE 50-60ML L/L NO NEEDLE", irc: "24288", qty: "doses_per_month" },
          { name: "NEEDLE 18G X 1\" HYPO", irc: "52210", qty: "doses_per_month" },
          { name: "NEEDLE 20G X 1\"", irc: "39767", qty: "doses_per_month" },
          { name: "SYRINGE 10CC 21G 1\" L/L (with needle)", irc: "17217", qty: "doses_per_month" },
          { name: "SYRINGE 10ML 20G 1\" L/L #9644 (with needle)", irc: "8248", qty: "doses_per_month" }
        ]
      },
      NEXVIAZYME: {
        name: "NEXVIAZYME",
        color: "#ff5500",
        inputType: "mg",
        base_supplies: [
          { name: "TUBING 92\" CURLIN NO/DEHP", irc: "36282", qty: "doses_per_month" },
          { name: "FILTERSET 0.2MICRON BAXTER", irc: "34857", qty: "doses_per_month", note: "CONSULT RPH IF DIFFERENT FILTER NEEDED" },
          { name: "SYRINGE 10ML L/L NO NDL", irc: "43637", qty: "doses_per_month", note: "Selection depending on patient/nurse preference" },
          { name: "SYRINGE 20ML L/L NO NDL", irc: "36842", qty: "doses_per_month" },
          { name: "SYRINGE 30ML L/L NO NDL", irc: "37100", qty: "doses_per_month" },
          { name: "SYRINGE 50-60ML L/L NO NEEDLE", irc: "24288", qty: "doses_per_month" },
          { name: "NEEDLE 18G X 1\" HYPO", irc: "52210", qty: "doses_per_month" },
          { name: "NEEDLE 20G X 1\"", irc: "39767", qty: "doses_per_month" },
          { name: "SYRINGE 10CC 21G 1\" L/L (with needle)", irc: "17217", qty: "doses_per_month" },
          { name: "SYRINGE 10ML 20G 1\" L/L #9644 (with needle)", irc: "8248", qty: "doses_per_month" }
        ],
        sterile_water_per_vial: 10,
        vial_size: 100
      },
      VIMIZIM: {
        name: "VIMIZIM",
        color: "#ff5500",
        inputType: "mg",
        base_supplies: [
          { name: "TUBING 92\" CURLIN NO/DEHP", irc: "36282", qty: "doses_per_month" },
          { name: "IV EXT .22 MICR FILT 10\"", irc: "38258", qty: "doses_per_month", note: "CONSULT RPH IF DIFFERENT FILTER NEEDED" },
          { name: "AMBER 5\" X 8\" 3MIL BAGS ++", irc: "17458", qty: "doses_per_month", note: "Per nurse request only" },
          { name: "SYRINGE 10ML L/L NO NDL", irc: "43637", qty: "doses_per_month", note: "Selection depending on patient/nurse preference" },
          { name: "SYRINGE 20ML L/L NO NDL", irc: "36842", qty: "doses_per_month" },
          { name: "SYRINGE 30ML L/L NO NDL", irc: "37100", qty: "doses_per_month" },
          { name: "SYRINGE 50-60ML L/L NO NEEDLE", irc: "24288", qty: "doses_per_month" },
          { name: "NEEDLE 18G X 1\" HYPO", irc: "52210", qty: "doses_per_month" },
          { name: "NEEDLE 20G X 1\"", irc: "39767", qty: "doses_per_month" },
          { name: "SYRINGE 10CC 21G 1\" L/L (with needle)", irc: "17217", qty: "doses_per_month" },
          { name: "SYRINGE 10ML 20G 1\" L/L #9644 (with needle)", irc: "8248", qty: "doses_per_month" }
        ]
      },
      VPRIV: {
        name: "VPRIV",
        color: "#ff5500",
        inputType: "mg_with_vials",
        base_supplies: [
          { name: "TUBING 92\" CURLIN NO/DEHP", irc: "36282", qty: "doses_per_month" },
          { name: "IV EXT SET 7\" 0.2 MICRON FILT", irc: "34258", qty: "doses_per_month", note: "MANUFACTURER RECOMMENDED - DO NOT SUBSTITUTE!" },
          { name: "AMBER 5\" X 8\" 3MIL BAGS ++", irc: "17458", qty: "doses_per_month" },
          { name: "SYRINGE 10ML L/L NO NDL", irc: "43637", qty: "doses_per_month", note: "Selection depending on patient/nurse preference" },
          { name: "SYRINGE 20ML L/L NO NDL", irc: "36842", qty: "doses_per_month" },
          { name: "SYRINGE 30ML L/L NO NDL", irc: "37100", qty: "doses_per_month" },
          { name: "SYRINGE 50-60ML L/L NO NEEDLE", irc: "24288", qty: "doses_per_month" },
          { name: "NEEDLE 18G X 1\" HYPO", irc: "52210", qty: "doses_per_month" },
          { name: "NEEDLE 20G X 1\"", irc: "39767", qty: "doses_per_month" },
          { name: "SYRINGE 10CC 21G 1\" L/L (with needle)", irc: "17217", qty: "doses_per_month" },
          { name: "SYRINGE 10ML 20G 1\" L/L #9644 (with needle)", irc: "8248", qty: "doses_per_month" }
        ],
        sterile_water_per_vial: 4.3,
        vial_size: 400
      },
      XENPOZYME: {
        name: "XENPOZYME",
        color: "#ff5500",
        inputType: "mg",
        base_supplies: [
          { name: "TUBING 92\" CURLIN NO/DEHP", irc: "36282", qty: "doses_per_month" },
          { name: "FILTERSET 0.2MICRON BAXTER", irc: "34857", qty: "doses_per_month", note: "CONSULT RPH IF DIFFERENT FILTER NEEDED" },
          { name: "SYRINGE 10ML L/L NO NDL", irc: "43637", qty: "doses_per_month", note: "Selection depending on patient/nurse preference" },
          { name: "SYRINGE 20ML L/L NO NDL", irc: "36842", qty: "doses_per_month" },
          { name: "SYRINGE 30ML L/L NO NDL", irc: "37100", qty: "doses_per_month" },
          { name: "SYRINGE 50-60ML L/L NO NEEDLE", irc: "24288", qty: "doses_per_month" },
          { name: "NEEDLE 18G X 1\" HYPO", irc: "52210", qty: "doses_per_month" },
          { name: "NEEDLE 20G X 1\"", irc: "39767", qty: "doses_per_month" },
          { name: "SYRINGE 10CC 21G 1\" L/L (with needle)", irc: "17217", qty: "doses_per_month" },
          { name: "SYRINGE 10ML 20G 1\" L/L #9644 (with needle)", irc: "8248", qty: "doses_per_month" }
        ],
        sterile_water_per_vial: 5.1,
        vial_size: 20
      }
    },
    sterile_water_products: {
      "10": { name: "STER WATER INJ HOSP 10ML", irc: "59824" },
      "20": { name: "STER WATER INJ HOSP 20ML", irc: "59024" },
      "50": { name: "STER WATER INJ HOSP 50ML", irc: "59825" }
    },
    iv_type_supplies: {
      "PIV SUPPLIES": [
        { name: "IV START KIT MSIV-014698", qty: "doses_per_month", irc: "37247" },
        { name: "CLAVE EXT SET 7\" REMOV MCR CLV", qty: "doses_per_month", irc: "43187" },
        { name: "IV CATH INTROCAN 22G X 1\"", qty: "doses_per_month", irc: "39333" },
        { name: "IV CATH INTROCAN SAFETY", qty: "doses_per_month", irc: "35348" },
        { name: "NORMAL SALINE FLUSH (10ML)", qty: "2", irc: "33633" }
      ],
      "PORT SUPPLIES": [
        { name: "CENTRAL LINE DRESSING KIT", qty: "doses_per_month", irc: "48513" },
        { name: "ULTRA SITE 2 WAY CAPLESS VAL", qty: "doses_per_month", irc: "27471" },
        { name: "IV EXT SET W/14\" ULT SITE", qty: "doses_per_month", irc: "35408" },
        { name: "HEPARIN L/L FLUSH SYRINGE (100 UNITS/ML)", qty: "doses_per_month", irc: "33503", note: "CONSULT RPH FOR CORRECT STRENGTH" },
        { name: "HEPARIN L/F SYR (3ML/SYR) (10 UNITS/ML)", qty: "doses_per_month", irc: "35027" },
        { name: "GRIPPER PLUS 22G 3/4\"", qty: "doses_per_month", irc: "37752", note: "Selection depending on patient/nurse preference" },
        { name: "HUBER NEEDLE 22G X 1\"", qty: "doses_per_month", irc: "30878" },
        { name: "GRIPPER PLUS 20G X 1\"", qty: "doses_per_month", irc: "33857" },
        { name: "HUBER ++ NEEDLE 20G3/4\" SAFEST", qty: "doses_per_month", irc: "44833" },
        { name: "SOD CHLOR POSIFL SF (10ML)", qty: "2", irc: "35290" }
      ],
      "PIC SUPPLIES": [
        { name: "DRESSING CHANGE PICC/MIDLIN", qty: "doses_per_month", irc: "48515" },
        { name: "ULTRA SITE 2 WAY CAPLESS VAL", qty: "doses_per_month", irc: "27471" },
        { name: "IV EXT SET W/14\" ULT SITE", qty: "doses_per_month", irc: "35408" },
        { name: "HEPARIN L/L FLUSH SYRINGE (100 UNITS/ML)", qty: "doses_per_month", irc: "33503", note: "CONSULT RPH FOR CORRECT STRENGTH" },
        { name: "HEPARIN L/F SYR (3ML/SYR) (10 UNITS/ML)", qty: "doses_per_month", irc: "35027" },
        { name: "GRIPPER PLUS 22G 3/4\"", qty: "doses_per_month", irc: "37752", note: "Selection depending on patient/nurse preference" },
        { name: "HUBER NEEDLE 22G X 1\"", qty: "doses_per_month", irc: "30878" },
        { name: "GRIPPER PLUS 20G X 1\"", qty: "doses_per_month", irc: "33857" },
        { name: "HUBER ++ NEEDLE 20G3/4\" SAFEST", qty: "doses_per_month", irc: "44833" },
        { name: "SOD CHLOR POSIFL SF (10ML)", qty: "2", irc: "35290" },
        { name: "BIOPATCH ++ DISK 1\" STERILE", qty: "doses_per_month", irc: "39061" }
      ],
      "CENTRAL SUPPLIES": [
        { name: "CENTRAL LINE DRESSING KIT", qty: "doses_per_month", irc: "48513" },
        { name: "ULTRA SITE 2 WAY CAPLESS VAL", qty: "doses_per_month", irc: "27471" },
        { name: "IV EXT SET W/14\" ULT SITE", qty: "doses_per_month", irc: "35408" },
        { name: "HEPARIN L/L FLUSH SYRINGE (100 UNITS/ML)", qty: "doses_per_month", irc: "33503" },
        { name: "HEPARIN L/F SYR (3ML/SYR) (10 UNITS/ML)", qty: "doses_per_month", irc: "35027" },
        { name: "SOD CHLOR POSIFL SF (10ML)", qty: "2", irc: "35290" }
      ]
    },
    gravity_supplies: [
      { name: "IV ADMIN SET 92: D-A-F (combo set)", irc: "43024", qty: "doses_per_month" }
    ],
    dr_cvs_supplies: [
      { name: "SHARPS CONTAINER MAILBACK 1GL", irc: "22640", qty: "1" },
      { name: "GLOVES NITRILE CHEMO PF MD", irc: "34096", qty: "100" },
      { name: "STERILE DISPS DRAPE 18 X 26", irc: "38490", qty: "1" },
      { name: "ALCOHOL SWABS", irc: "36267", qty: "100" },
      { name: "TEGADERM 2 3/8\" X 2 3/4\"", irc: "33855", qty: "doses_per_month" },
      { name: "TOURNIQUET ADJUSTABLE", irc: "33903", qty: "doses_per_month" }
    ],
    adr_pre_meds_supplies: [
      { name: "NS 0.9% 50ML (SM BAG)", irc: "8953", qty: "1" },
      { name: "DIPHENHYDRAMINE 50MG/ML 1ML VL", irc: "", qty: "doses_per_month", note: "RX NEEDED, DOSING MAY VARY" },
      { name: "ACETAMINOPHEN 160MG/5ML SUSP 4OZ", irc: "", qty: "1" },
      { name: "HYDROCORTISONE 100MG ACT-O-VL 2ML", irc: "", qty: "doses_per_month" },
      { name: "METHYLPREDNISOLONE 40MG/ML 1ML VL", irc: "", qty: "doses_per_month" },
      { name: "SYRINGE 1ML 25G 5/8\" S/S L/L", irc: "17140", qty: "doses_per_month" },
      { name: "SYRINGE 3ML 21G 1\" S/S", irc: "13846", qty: "doses_per_month" },
      { name: "SYRINGE 3ML 22G 1\" S/S", irc: "17160", qty: "doses_per_month" },
      { name: "SYRINGE 3ML 23G 1\" S/S", irc: "13847", qty: "doses_per_month" },
      { name: "SYRINGE 3ML 25G 5/8\" S/S", irc: "13848", qty: "doses_per_month" },
      { name: "SYRINGE 5ML 21G 1\" S/S", irc: "26749", qty: "doses_per_month" },
      { name: "NEEDLE 18G X 1 1/2\" HYPO", irc: "52211", qty: "doses_per_month" },
      { name: "EPINEPHRINE 0.3MG EPIPEN JR 2 PACK", irc: "", qty: "1" },
      { name: "EPINEPHRINE 0.3MG AUTO-INJ 2 PACK", irc: "", qty: "1" },
      { name: "EPINEPHRINE 0.15MG AUTO-INJ 2 PACK", irc: "", qty: "1" },
      { name: "EPINEPHRINE 0.15MG EPIPEN JR 2 PACK", irc: "", qty: "1" },
      { name: "DEXAMETHASONE 4MG/ML 1ML VL", irc: "", qty: "doses_per_month" },
      { name: "FAMOTIDINE 20MG/2ML (10MG/ML) 2ML VL", irc: "", qty: "doses_per_month" },
      { name: "MEPERIDINE 25MG/ML 1ML VL", irc: "", qty: "doses_per_month" },
      { name: "MEPERIDINE 50MG/ML 1ML VL", irc: "", qty: "doses_per_month" },
      { name: "METHYLPRED 125MG ACT-O-VL 2ML", irc: "", qty: "doses_per_month" },
      { name: "MORPHINE 10MG/ML SDV 1ML", irc: "", qty: "doses_per_month" },
      { name: "FENTANYL 50MCG/ML 2ML VL", irc: "", qty: "doses_per_month" },
      { name: "MIDAZOLAM 2MG/2ML (1MG/ML) 2ML VL", irc: "", qty: "doses_per_month" },
      { name: "HYDRALAZINE 20MG/ML 1ML VL", irc: "", qty: "doses_per_month" },
      { name: "PROMETHAZINE 25MG/ML 1ML VL", irc: "", qty: "doses_per_month" },
      { name: "PROMETHAZINE 50MG/ML 1ML VL", irc: "", qty: "doses_per_month" },
      { name: "TYLENOL 500MG CAP 100", irc: "", qty: "1" }
    ],
    calculation_rules: {
      saline_volume_selection: [
        { max: 100, product: "SOD CHLOR (100ML/BAG)", irc: "53127", bagSize: 100 },
        { max: 250, product: "SOD CHLOR (250ML/BAG)", irc: "37725", bagSize: 250 },
        { max: 1000, product: "SOD CHLOR (500ML/BAG)", irc: "37726", bagSize: 500 }
      ]
    },
    notes: {
      consult_rph: "Consult RPH for patient-specific requirements"
    }
  };

  // Helper function to apply SPRX minimum to supplies
  const applySprxMinimum = (supplies, sprxMin) => {
    return supplies.map(supply => {
      // For items with specific quantities like "100" or "1", keep them as is
      // These are fixed quantities that should not be affected by SPRX
      if (supply.qty && supply.qty !== 'doses_per_month') {
        const specificQty = parseInt(supply.qty) || 1;
        return {
          ...supply,
          totalQuantity: specificQty
        };
      }
      // For doses_per_month items, only apply SPRX minimum to certain supplies
      // Based on Excel analysis, SPRX minimum should not be universally applied
      return {
        ...supply,
        totalQuantity: supply.totalQuantity || 0
      };
    });
  };

  // Calculate supplies whenever inputs change
  useEffect(() => {
    if (selectedMedication && dosesPerMonth) {
      const medication = suppliesData.medications[selectedMedication];
      if (medication.inputType === 'mg' && mgPerDose) {
        calculateSupplies();
      } else if (medication.inputType === 'units' && unitsPerDose) {
        calculateSupplies();
      } else if (medication.inputType === 'mg_with_vials' && mgPerDose) {
        if (selectedMedication === 'FABRAZYME' && (number5mgVials || number35mgVials)) {
          calculateSupplies();
        } else if ((selectedMedication === 'LUMIZYME' || selectedMedication === 'VPRIV') && numberOfVials) {
          calculateSupplies();
        }
      }
    }
  }, [selectedMedication, dosesPerMonth, mgPerDose, unitsPerDose, numberOfVials, number5mgVials, number35mgVials, volumeToInfuse, gravityInfusion, ivSuppliesType, adrPremedsRequired, sprxQuantity, sterileWaterVialSize, isHomeInfusion]);

  // Save calculation to Firebase
  const saveToFirebase = async (calculationData) => {
    if (!firestore) {
      console.log('Firebase not available - running in offline mode');
      return;
    }
    
    try {
      const docRef = await addDoc(collection(firestore, 'supplies_calculations'), {
        ...calculationData,
        timestamp: serverTimestamp(),
        createdAt: new Date().toISOString()
      });
      console.log('Calculation saved to Firebase with ID:', docRef.id);
    } catch (error) {
      console.error('Error saving to Firebase:', error);
    }
  };

  const calculateSupplies = () => {
    try {
      console.log('=== SUPPLIES CALCULATOR UPDATE CHECK ===');
      console.log('Version: 2024-01-23 v3 - SPRX only for CEREZYME, ELELYSO, NEXVIAZYME, XENPOZYME');
      
      // Check for required fields
      if (!selectedMedication || !dosesPerMonth) {
        setErrorMessage('Please fill in all required fields');
        setTimeout(() => setErrorMessage(''), 3000);
        return;
      }
      
      // Check for validation errors
      if (validationErrors.length > 0) {
        setErrorMessage('Please correct the errors before calculating');
        setTimeout(() => setErrorMessage(''), 3000);
        return;
      }
      
      // Clear any existing error message
      setErrorMessage('');

      const medication = suppliesData.medications[selectedMedication];
      if (!medication) {
        console.error(`Medication not found: ${selectedMedication}`);
        return;
      }

      const doses = parseInt(dosesPerMonth) || 0;
      const sprxQty = parseInt(sprxQuantity) || 0;
      const log = [];

      console.log('Input values:', { doses, sprxQty, sprxQuantity });
      log.push(`Calculating supplies for ${medication.name}`);
      log.push(`Doses per month: ${doses}`);
      log.push(`SPRX quantity: ${sprxQty}`);

      // Base Supplies
      let baseSupplies = medication.base_supplies.map(supply => {
        let quantity = doses;
        if (supply.qty) {
          if (supply.qty === 'doses_per_month') {
            quantity = doses;
            // Show actual calculated quantity, not SPRX minimum
            log.push(`Base supply ${supply.name}: doses=${doses}, quantity=${quantity}`);
          } else {
            quantity = parseInt(supply.qty) || 1;
            // Fixed quantities (like 1 or 100) stay as is
          }
        } else {
          // If no qty specified, default to doses
          quantity = doses;
          log.push(`Base supply ${supply.name} (no qty): doses=${doses}, quantity=${quantity}`);
        }
        return { ...supply, totalQuantity: quantity, isConditional: false };
      });

      // Calculate sterile water for applicable medications
      if (medication.sterile_water_per_vial) {
        // Remove any existing sterile water from base supplies
        baseSupplies = baseSupplies.filter(supply => !supply.name.includes('STERILE WATER') && !supply.name.includes('STER WATER'));
        
        const vialSizeSelected = parseInt(sterileWaterVialSize) || 10;
        let dispensedQuantity = 0;
        
        // Calculate based on medication-specific logic matching Excel formulas
        if (selectedMedication === 'FABRAZYME') {
          // Excel formula: ROUNDUP(($C$306/$C$305*1.1+$C$307/$C$305*7.2)/vial_size,0)*$C$305*vial_size
          // C306 = 5mg vials, C307 = 35mg vials, C305 = doses per month
          const vials5mg = parseInt(number5mgVials) || 0;
          const vials35mg = parseInt(number35mgVials) || 0;
          const totalMLNeeded = (vials5mg * 1.1) + (vials35mg * 7.2);
          const vialsNeeded = Math.ceil(totalMLNeeded / vialSizeSelected);
          dispensedQuantity = vialsNeeded * vialSizeSelected;
        } else if (selectedMedication === 'CEREZYME') {
          // Excel formula: doses * ROUNDUP(sprx * sterile_water_per_vial / doses / vial_size, 0)
          const vialsNeeded = Math.ceil((sprxQty * medication.sterile_water_per_vial) / doses / vialSizeSelected);
          dispensedQuantity = doses * vialsNeeded * vialSizeSelected;
        } else if (selectedMedication === 'ELELYSO') {
          // Excel formula: doses * ROUNDUP(sprx * 5.1 / doses / vial_size, 0)
          const vialsNeeded = Math.ceil((sprxQty * 5.1) / doses / vialSizeSelected);
          dispensedQuantity = doses * vialsNeeded * vialSizeSelected;
        } else if (selectedMedication === 'LUMIZYME' || selectedMedication === 'VPRIV') {
          // Excel formula: doses * ROUNDUP(vials * sterile_water_per_vial / doses / vial_size, 0)
          const vialCount = parseInt(numberOfVials) || 0;
          const vialsNeeded = Math.ceil((vialCount * medication.sterile_water_per_vial) / doses / vialSizeSelected);
          dispensedQuantity = doses * vialsNeeded * vialSizeSelected;
        } else if (selectedMedication === 'NEXVIAZYME') {
          // For NEXVIAZYME: needs sterile water calculation
          const mgDose = parseFloat(mgPerDose) || 0;
          const vialCount = Math.ceil(mgDose / medication.vial_size);
          const totalMLPerDose = vialCount * medication.sterile_water_per_vial;
          const vialsNeeded = Math.ceil(totalMLPerDose / vialSizeSelected);
          dispensedQuantity = vialsNeeded * doses * vialSizeSelected;
        } else if (selectedMedication === 'XENPOZYME') {
          // For XENPOZYME: needs sterile water calculation
          const mgDose = parseFloat(mgPerDose) || 0;
          const vialCount = Math.ceil(mgDose / medication.vial_size);
          const totalMLPerDose = vialCount * medication.sterile_water_per_vial;
          const vialsNeeded = Math.ceil(totalMLPerDose / vialSizeSelected);
          dispensedQuantity = vialsNeeded * doses * vialSizeSelected;
        }

        if (dispensedQuantity > 0 && suppliesData.sterile_water_products[sterileWaterVialSize]) {
          const sterileWaterProduct = suppliesData.sterile_water_products[sterileWaterVialSize];
          baseSupplies.push({
            name: sterileWaterProduct.name,
            irc: sterileWaterProduct.irc,
            totalQuantity: dispensedQuantity,
            isConditional: false,
            note: `Calculated for reconstitution`
          });
          log.push(`Sterile water: ${dispensedQuantity}mL total (${sterileWaterProduct.name})`);
        }
      }

      // Saline Volume Logic - Add saline as a base supply
      if (volumeToInfuse && suppliesData.calculation_rules?.saline_volume_selection) {
        const volume = parseInt(volumeToInfuse);
        const salineRules = suppliesData.calculation_rules.saline_volume_selection;
        const salineRule = salineRules.find(rule => volume <= rule.max);
        if (salineRule) {
          // Display total mL based on bag size × doses
          let displayQty = salineRule.bagSize * doses;
          
          baseSupplies.push({
            name: salineRule.product,
            irc: salineRule.irc,
            totalQuantity: displayQty,
            isConditional: false,
            note: `Selected based on ${volume}mL infusion volume`
          });
          log.push(`Added saline: ${salineRule.product} - ${displayQty}mL total (${doses} bags × ${salineRule.bagSize}mL)`);
        }
      }

      // Shipping Card for specific medications
      if ((selectedMedication === 'NAGLAZYME' || selectedMedication === 'VIMIZIM') && isHomeInfusion === 'YES') {
        const cardName = selectedMedication === 'NAGLAZYME' ? 'NAGLAZYME INFUSION SHIP CARD' : 'VIMIZIM INFUSION SHIP CARD';
        const cardIrc = selectedMedication === 'NAGLAZYME' ? '41600' : '39017';
        baseSupplies.push({
          name: cardName,
          irc: cardIrc,
          totalQuantity: 1,
          isConditional: false,
          note: 'For home infusion patients'
        });
        log.push(`Added ${cardName} for home infusion`);
      }

      // IV Supplies
      let ivSupplies = [];
      if (suppliesData.iv_type_supplies[ivSuppliesType]) {
        ivSupplies = suppliesData.iv_type_supplies[ivSuppliesType].map(supply => {
          let quantity = doses;
          if (supply.qty && supply.qty !== 'doses_per_month') {
            // For fixed quantities like "2", these are per dose
            quantity = parseInt(supply.qty) || 1;
            quantity = quantity * doses;
          }
          log.push(`IV supply ${supply.name}: qty=${supply.qty}, doses=${doses}, quantity=${quantity}`);
          return {
            ...supply,
            totalQuantity: quantity,
            isConditional: true,
            conditionNote: 'IV access supply'
          };
        });
      }
      log.push(`Added ${ivSuppliesType}`);

      // Gravity Supplies
      let gravitySupplies = [];
      if (gravityInfusion === 'Yes' && suppliesData.gravity_supplies) {
        gravitySupplies = suppliesData.gravity_supplies.map(supply => {
          // Show actual calculated quantity
          const quantity = doses;
          return {
            ...supply,
            totalQuantity: quantity,
            isConditional: true,
            conditionNote: 'Gravity infusion supply'
          };
        });
        log.push(`Added gravity infusion supplies`);
      }

      // ADR/Pre-Med Supplies
      let adrSupplies = [];
      if (adrPremedsRequired === 'YES' && suppliesData.adr_pre_meds_supplies) {
        adrSupplies = suppliesData.adr_pre_meds_supplies.map(supply => {
          let quantity = 1;
          if (supply.qty) {
            if (supply.qty === 'doses_per_month') {
              quantity = doses;
              // Show actual calculated quantity
            } else {
              quantity = parseInt(supply.qty) || 1;
              // Fixed quantities stay as is
            }
          }
          return {
            ...supply,
            totalQuantity: quantity,
            isConditional: true,
            conditionNote: 'ADR/Pre-medication supply'
          };
        });
      }
      log.push(`Added ADR/Pre-medication supplies with SPRX minimum where applicable`);

      // Standard DR/CVS Supplies
      let standardSupplies = [];
      if (suppliesData.dr_cvs_supplies) {
        standardSupplies = suppliesData.dr_cvs_supplies.map(supply => {
          let quantity = 1;
          if (supply.qty) {
            if (supply.qty === 'doses_per_month') {
              quantity = doses;
              // Show actual calculated quantity
            } else {
              quantity = parseInt(supply.qty) || 1;
              // Fixed quantities like 100 for gloves, 1 for sharps container stay as is
            }
          }
          return {
            ...supply,
            totalQuantity: quantity,
            isConditional: false
          };
        });
      }

      // SPRX minimum has been applied to all per-dose items as per Excel "MINIMUM QUANTITY IN SPRX" header

      setCalculationLog(log);
      const calculationResults = {
        baseSupplies,
        ivSupplies,
        gravitySupplies,
        adrSupplies,
        standardSupplies
      };
      setCalculatedSupplies(calculationResults);
      setShowResults(true);
      
      // Save to Firebase
      const calculationData = {
        medication: selectedMedication,
        inputs: {
          mgPerDose: mgPerDose || null,
          unitsPerDose: unitsPerDose || null,
          dosesPerMonth: doses,
          sprxQuantity: sprxQty,
          volumeToInfuse: volumeToInfuse || null,
          gravityInfusion,
          ivSuppliesType,
          adrPremedsRequired,
          number5mgVials: number5mgVials || null,
          number35mgVials: number35mgVials || null,
          numberOfVials: numberOfVials || null,
          isHomeInfusion: isHomeInfusion || null,
          sterileWaterVialSize: sterileWaterVialSize || null
        },
        results: calculationResults,
        calculationLog: log
      };
      
      saveToFirebase(calculationData);
    } catch (error) {
      console.error('Error calculating supplies:', error);
      alert('An error occurred while calculating supplies. Please check your inputs and try again.');
      setCalculatedSupplies(null);
      setShowResults(false);
    }
  };

  // Get medication info and notes
  const getMedicationInfo = () => {
    try {
      if (!selectedMedication) return null;
      
      const medication = suppliesData.medications[selectedMedication];
      if (!medication) return null;
      
      const info = {
        filterType: 'Standard',
        requiresLightProtection: false,
        manufacturerNote: null,
        specialNotes: [],
        hasConsultNotes: false
      };
      
      // Check for filter consult notes in base supplies
      if (medication.base_supplies && Array.isArray(medication.base_supplies)) {
        medication.base_supplies.forEach(supply => {
          if (supply.note && supply.note.includes('CONSULT RPH')) {
            info.hasConsultNotes = true;
            if (supply.note.includes('FILTER')) {
              info.filterType = '0.22 micron (Consult RPH if different filter needed)';
            }
          }
          
          // Check for manufacturer-specific notes
          if (supply.note && supply.note.includes('MANUFACTURER RECOMMENDED')) {
            info.manufacturerNote = supply.note;
          }
        });
        
        // Check light protection (amber bags)
        const hasAmberBags = medication.base_supplies.some(s => s.name.includes('AMBER'));
        if (hasAmberBags) {
          info.requiresLightProtection = true;
        }
      }
      
      // Add general notes from the data
      if (suppliesData.notes) {
        if (suppliesData.notes.consult_rph) {
          info.specialNotes.push(suppliesData.notes.consult_rph);
        }
      }
      
      return info;
    } catch (error) {
      console.error('Error getting medication info:', error);
      return null;
    }
  };

  // Toggle row check state
  const toggleRowCheck = (rowId) => {
    setCheckedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rowId)) {
        newSet.delete(rowId);
      } else {
        newSet.add(rowId);
      }
      return newSet;
    });
  };

  const handleReset = () => {
    setMgPerDose('');
    setDosesPerMonth('');
    setSprxQuantity('');
    setVolumeToInfuse('');
    setGravityInfusion('No');
    setIvSuppliesType('PORT SUPPLIES');
    setAdrPremedsRequired('NO');
    setSelectedMedication(null);
    setCalculatedSupplies(null);
    setShowResults(false);
    setCalculationLog([]);
    setCheckedRows(new Set());
    setSterileWaterVialSize('10');
    setUnitsPerDose('');
    setNumberOfVials('');
    setNumber5mgVials('');
    setNumber35mgVials('');
    setIsHomeInfusion('NO');
  };

  // Clear medication-specific fields when medication changes
  useEffect(() => {
    if (selectedMedication) {
      // Clear all medication-specific inputs when switching medications
      setMgPerDose('');
      setUnitsPerDose('');
      setNumberOfVials('');
      setNumber5mgVials('');
      setNumber35mgVials('');
      setShowResults(false);
      setCalculatedSupplies(null);
      
      // Don't clear SPRX - all medications have this field based on screenshots
      
      // Reset home infusion for medications that don't need it
      if (selectedMedication !== 'NAGLAZYME' && selectedMedication !== 'VIMIZIM') {
        setIsHomeInfusion('NO');
      }
    }
  }, [selectedMedication]);

  // Validation
  const validateInputs = () => {
    const errors = [];
    
    if (selectedMedication) {
      const medication = suppliesData.medications[selectedMedication];
      
      if (medication.inputType === 'mg' && mgPerDose && parseFloat(mgPerDose) <= 0) {
        errors.push('Mg per dose must be greater than 0');
      }
      
      if (medication.inputType === 'units' && unitsPerDose && parseFloat(unitsPerDose) <= 0) {
        errors.push('Units per dose must be greater than 0');
      }
    }
    
    if (dosesPerMonth && parseInt(dosesPerMonth) <= 0) {
      errors.push('Doses per month must be greater than 0');
    }
    
    if (volumeToInfuse && parseInt(volumeToInfuse) <= 0) {
      errors.push('Volume to infuse must be greater than 0');
    }
    
    return errors;
  };

  const validationErrors = validateInputs();
  const medicationInfo = getMedicationInfo();

  // Render medication-specific input fields
  const renderMedicationInputs = () => {
    if (!selectedMedication) return null;
    
    const medication = suppliesData.medications[selectedMedication];
    const inputs = [];
    
    // First field: Medication-specific dose input (matches Excel order)
    if (medication.inputType === 'mg' || medication.inputType === 'mg_with_vials') {
      inputs.push(
        <div key="mg" className="input-group">
          <label>Mg per dose</label>
          <input
            type="number"
            value={mgPerDose}
            onChange={(e) => setMgPerDose(e.target.value)}
            placeholder="Enter mg per dose"
            className="supply-input"
          />
        </div>
      );
    } else if (medication.inputType === 'units') {
      inputs.push(
        <div key="units" className="input-group">
          <label>Units per dose</label>
          <input
            type="number"
            value={unitsPerDose}
            onChange={(e) => setUnitsPerDose(e.target.value)}
            placeholder="Enter units per dose"
            className="supply-input"
          />
        </div>
      );
    }
    
    // Second field: Number of doses per month
    inputs.push(
      <div key="doses" className="input-group">
        <label>Number of doses per month</label>
        <input
          type="number"
          value={dosesPerMonth}
          onChange={(e) => setDosesPerMonth(e.target.value)}
          placeholder="Enter doses per month"
          className="supply-input"
        />
      </div>
    );
    
    // Third field: Vial inputs for specific medications (BEFORE SPRX)
    if (selectedMedication === 'FABRAZYME') {
      inputs.push(
        <div key="5mg-vials" className="input-group">
          <label>Number of 5 mg vials to dispense</label>
          <input
            type="number"
            value={number5mgVials}
            onChange={(e) => setNumber5mgVials(e.target.value)}
            placeholder="Enter 5mg vials"
            className="supply-input"
          />
        </div>
      );
      inputs.push(
        <div key="35mg-vials" className="input-group">
          <label>Number of 35 mg vials to dispense</label>
          <input
            type="number"
            value={number35mgVials}
            onChange={(e) => setNumber35mgVials(e.target.value)}
            placeholder="Enter 35mg vials"
            className="supply-input"
          />
        </div>
      );
    } else if (selectedMedication === 'LUMIZYME' || selectedMedication === 'VPRIV') {
      inputs.push(
        <div key="vials" className="input-group">
          <label>Number of vials to dispense</label>
          <input
            type="number"
            value={numberOfVials}
            onChange={(e) => setNumberOfVials(e.target.value)}
            placeholder="Enter number of vials"
            className="supply-input"
          />
        </div>
      );
    }
    
    // Fourth field: SPRX Quantity - ALL medications have this field per screenshots
    inputs.push(
      <div key="sprx" className="input-group">
        <label>SPRX quantity to dispense</label>
        <input
          type="number"
          value={sprxQuantity}
          onChange={(e) => setSprxQuantity(e.target.value)}
          placeholder="Enter SPRX quantity"
          className="supply-input"
        />
      </div>
    );
    
    // Volume to infuse drug in
    inputs.push(
      <div key="volume" className="input-group">
        <label>Volume to infuse drug in</label>
        <input
          type="number"
          value={volumeToInfuse}
          onChange={(e) => setVolumeToInfuse(e.target.value)}
          placeholder="Enter volume in mL"
          className="supply-input"
        />
      </div>
    );
    
    // Sterile water vial size (only for medications that need sterile water)
    const needsSterileWater = ['CEREZYME', 'ELELYSO', 'FABRAZYME', 'LUMIZYME', 'NEXVIAZYME', 'VPRIV', 'XENPOZYME'].includes(selectedMedication);
    if (needsSterileWater) {
      inputs.push(
        <div key="sterile-water" className="input-group">
          <label>Sterile water vial size to dispense (mL)</label>
          <div className="custom-dropdown">
            <select
              value={sterileWaterVialSize}
              onChange={(e) => setSterileWaterVialSize(e.target.value)}
              className="supply-dropdown"
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </select>
            <ChevronDown className="dropdown-icon" size={16} />
          </div>
        </div>
      );
    }
    
    // Will patient be infusing via gravity?
    inputs.push(
      <div key="gravity" className="input-group">
        <label>Will patient be infusing via gravity?</label>
        <div className="custom-dropdown">
          <select
            value={gravityInfusion}
            onChange={(e) => setGravityInfusion(e.target.value)}
            className="supply-dropdown"
          >
            <option value="No">No</option>
            <option value="Yes">Yes</option>
          </select>
          <ChevronDown className="dropdown-icon" size={16} />
        </div>
      </div>
    );
    
    // Type of IV Supplies Needed
    inputs.push(
      <div key="iv-type" className="input-group">
        <label>Type of IV Supplies Needed</label>
        <div className="custom-dropdown">
          <select
            value={ivSuppliesType}
            onChange={(e) => setIvSuppliesType(e.target.value)}
            className="supply-dropdown"
          >
            <option value="PORT SUPPLIES">PORT</option>
            <option value="PIV SUPPLIES">PIV</option>
            <option value="PIC SUPPLIES">PIC</option>
          </select>
          <ChevronDown className="dropdown-icon" size={16} />
        </div>
      </div>
    );
    
    // ADR or Pre-Meds required?
    inputs.push(
      <div key="adr" className="input-group">
        <label>ADR or Pre-Meds required?</label>
        <div className="custom-dropdown">
          <select
            value={adrPremedsRequired}
            onChange={(e) => setAdrPremedsRequired(e.target.value)}
            className="supply-dropdown"
          >
            <option value="NO">NO</option>
            <option value="YES">YES</option>
          </select>
          <ChevronDown className="dropdown-icon" size={16} />
        </div>
      </div>
    );
    
    // Is this a home infusion patient? (only for Naglazyme and Vimizim)
    if (selectedMedication === 'NAGLAZYME' || selectedMedication === 'VIMIZIM') {
      inputs.push(
        <div key="home-infusion" className="input-group">
          <label>Is this a home infusion patient?</label>
          <div className="custom-dropdown">
            <select
              value={isHomeInfusion}
              onChange={(e) => setIsHomeInfusion(e.target.value)}
              className="supply-dropdown"
            >
              <option value="NO">NO</option>
              <option value="YES">YES</option>
            </select>
            <ChevronDown className="dropdown-icon" size={16} />
          </div>
        </div>
      );
    }
    
    return inputs;
  };

  return (
    <div className="supplies-page page-container">
      <div className="supplies-content">
        <div className="supplies-dashboard">

          {/* Infusion Guide Section */}
          <div className="dashboard-card infusion-guide-card">
            <div 
              className="card-header clickable" 
              onClick={() => setShowInfusionGuide(!showInfusionGuide)}
              style={{ cursor: 'pointer' }}
            >
              <h3>Infusion Type Identification Guide</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Info size={20} />
                {showInfusionGuide ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </div>
            </div>
            {showInfusionGuide && (
              <div className="card-body">
                <p style={{ marginBottom: '20px', color: '#666' }}>
                  This guide helps identify infusion types (PIV, PIC, PORT) based on supply kits commonly used in infusion prescriptions.
                </p>
                
                <div className="infusion-types-grid">
                  {/* PIV Section */}
                  <div className="infusion-type-section">
                    <div className="infusion-type-header" style={{ backgroundColor: '#e3f2fd', color: '#1976d2' }}>
                      <h4>PIV (Peripheral IV)</h4>
                    </div>
                    <div className="infusion-type-content">
                      {/* Information Dropdown */}
                      <div style={{ marginBottom: '15px' }}>
                        <div 
                          onClick={() => setShowPIVInfo(!showPIVInfo)}
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'space-between',
                            padding: '8px 12px',
                            backgroundColor: '#e3f2fd',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#1976d2' }}>
                            <Info size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                            Information
                          </span>
                          {showPIVInfo ? <ChevronUp size={16} color="#1976d2" /> : <ChevronDown size={16} color="#1976d2" />}
                        </div>
                        {showPIVInfo && (
                          <div style={{ marginTop: '10px', padding: '12px', backgroundColor: '#f5f9ff', borderRadius: '6px', fontSize: '0.85rem', lineHeight: '1.6' }}>
                            <p style={{ margin: '0 0 8px 0', fontWeight: '600', color: '#1565c0' }}>🔹 Short-term, simple access</p>
                            <ul style={{ margin: '0', paddingLeft: '20px', color: '#424242' }}>
                              <li>Inserted into small peripheral veins, usually in the arm or hand.</li>
                              <li>Used for short-duration IV fluids, meds, or antibiotics (usually &lt;3–5 days).</li>
                              <li>Easily placed at bedside by nurses.</li>
                              <li>Visible externally with a small catheter and taped dressing.</li>
                              <li>No surgery or imaging needed.</li>
                            </ul>
                            <p style={{ margin: '8px 0 0 0', fontStyle: 'italic', color: '#616161' }}>
                              <strong>Example:</strong> ER fluids, single antibiotic dose, hydration.
                            </p>
                          </div>
                        )}
                      </div>

                      <h5 style={{ marginBottom: '10px', fontSize: '0.9rem', fontWeight: '600' }}>Key Identifiers:</h5>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        <li style={{ marginBottom: '5px' }}>• IV Start Kit (IRC: 37247)</li>
                        <li style={{ marginBottom: '5px' }}>• Introcan IV Cath 22G or Safety Caths (IRC: 39333, 35348)</li>
                        <li style={{ marginBottom: '5px' }}>• Clave Extension Set (IRC: 43187)</li>
                        <li style={{ marginBottom: '5px' }}>• Normal Saline Flush (10mL) (IRC: 33633)</li>
                      </ul>
                      <div className="infusion-type-tip" style={{ marginTop: '10px', padding: '8px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                        <strong style={{ fontSize: '0.85rem' }}>➤ Look for:</strong> <span style={{ fontSize: '0.85rem' }}>Introcan catheters, PIV start kit, and normal saline flushes.</span>
                      </div>
                    </div>
                  </div>

                  {/* PIC Section */}
                  <div className="infusion-type-section">
                    <div className="infusion-type-header" style={{ backgroundColor: '#e8f5e9', color: '#388e3c' }}>
                      <h4>PIC (PICC - Peripherally Inserted Central Catheter)</h4>
                    </div>
                    <div className="infusion-type-content">
                      {/* Information Dropdown */}
                      <div style={{ marginBottom: '15px' }}>
                        <div 
                          onClick={() => setShowPICInfo(!showPICInfo)}
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'space-between',
                            padding: '8px 12px',
                            backgroundColor: '#e8f5e9',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#388e3c' }}>
                            <Info size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                            Information
                          </span>
                          {showPICInfo ? <ChevronUp size={16} color="#388e3c" /> : <ChevronDown size={16} color="#388e3c" />}
                        </div>
                        {showPICInfo && (
                          <div style={{ marginTop: '10px', padding: '12px', backgroundColor: '#f5fdf5', borderRadius: '6px', fontSize: '0.85rem', lineHeight: '1.6' }}>
                            <p style={{ margin: '0 0 8px 0', fontWeight: '600', color: '#2e7d32' }}>🔹 Mid-to-long-term central access</p>
                            <ul style={{ margin: '0', paddingLeft: '20px', color: '#424242' }}>
                              <li>Inserted in a peripheral vein but tip rests in a central vein (like the superior vena cava).</li>
                              <li>Used for longer therapies (weeks to months), like IV antibiotics, TPN, or chemo.</li>
                              <li>Placed by trained nurses under ultrasound guidance.</li>
                              <li>Has external tubing, secured with a dressing.</li>
                              <li>Requires routine flushing and sterile dressing changes.</li>
                            </ul>
                            <p style={{ margin: '8px 0 0 0', fontStyle: 'italic', color: '#616161' }}>
                              <strong>Example:</strong> 6-week home IV antibiotics or outpatient infusion therapy.
                            </p>
                          </div>
                        )}
                      </div>

                      <h5 style={{ marginBottom: '10px', fontSize: '0.9rem', fontWeight: '600' }}>Key Identifiers:</h5>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        <li style={{ marginBottom: '5px' }}>• Dressing Change PICC/Midline Kit (IRC: 48515)</li>
                        <li style={{ marginBottom: '5px' }}>• Biopatch + Disk 1" Sterile (IRC: 39861)</li>
                        <li style={{ marginBottom: '5px' }}>• Gripper Plus 22G or 20G (IRC: 37752, 33857)</li>
                        <li style={{ marginBottom: '5px' }}>• Huber Needle (IRC: 38878, 44833)</li>
                        <li style={{ marginBottom: '5px' }}>• Sodium Chloride Sterile field Posiflush 10ml (IRC: 35290)</li>
                        <li style={{ marginBottom: '5px' }}>• Heparin Flushes</li>
                        <li style={{ marginBottom: '5px' }}>• Extension Sets</li>
                      </ul>
                      <div className="infusion-type-tip" style={{ marginTop: '10px', padding: '8px', backgroundColor: '#e8f5e9', borderRadius: '4px' }}>
                        <strong style={{ fontSize: '0.85rem' }}>➤ Key Identifier:</strong> <span style={{ fontSize: '0.85rem' }}>Look for PICC/Midline Dressing Kit and Biopatch - these are unique to PICC lines.</span>
                      </div>
                    </div>
                  </div>

                  {/* PORT Section */}
                  <div className="infusion-type-section">
                    <div className="infusion-type-header" style={{ backgroundColor: '#fff3e0', color: '#f57c00' }}>
                      <h4>PORT (Implanted Port)</h4>
                    </div>
                    <div className="infusion-type-content">
                      {/* Information Dropdown */}
                      <div style={{ marginBottom: '15px' }}>
                        <div 
                          onClick={() => setShowPORTInfo(!showPORTInfo)}
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'space-between',
                            padding: '8px 12px',
                            backgroundColor: '#fff3e0',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#f57c00' }}>
                            <Info size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                            Information
                          </span>
                          {showPORTInfo ? <ChevronUp size={16} color="#f57c00" /> : <ChevronDown size={16} color="#f57c00" />}
                        </div>
                        {showPORTInfo && (
                          <div style={{ marginTop: '10px', padding: '12px', backgroundColor: '#fffaf5', borderRadius: '6px', fontSize: '0.85rem', lineHeight: '1.6' }}>
                            <p style={{ margin: '0 0 8px 0', fontWeight: '600', color: '#e65100' }}>🔹 Long-term, surgically implanted central access</p>
                            <ul style={{ margin: '0', paddingLeft: '20px', color: '#424242' }}>
                              <li>Implanted under the skin, usually in the chest.</li>
                              <li>Catheter connects to a central vein.</li>
                              <li>Accessed only when needed using a Huber needle.</li>
                              <li>Used for intermittent but long-term treatment (months to years).</li>
                              <li>No external parts when not accessed — lower infection risk.</li>
                              <li>Requires surgical placement and occasional flushing when not in use.</li>
                            </ul>
                            <p style={{ margin: '8px 0 0 0', fontStyle: 'italic', color: '#616161' }}>
                              <strong>Example:</strong> Oncology patients receiving chemo over several months or years.
                            </p>
                          </div>
                        )}
                      </div>

                      <h5 style={{ marginBottom: '10px', fontSize: '0.9rem', fontWeight: '600' }}>Key Identifiers:</h5>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        <li style={{ marginBottom: '5px' }}>• Central Line Dressing Kit (IRC: 48513)</li>
                        <li style={{ marginBottom: '5px' }}>• Gripper Plus (22G/20G) (IRC: 37752, 33857)</li>
                        <li style={{ marginBottom: '5px' }}>• Huber Needle 22G / 20G SAFEST (IRC: 38878, 44833)</li>
                        <li style={{ marginBottom: '5px' }}>• Sodium Chloride Sterile field Posiflush 10ml (IRC: 35290)</li>
                        <li style={{ marginBottom: '5px' }}>• Heparin Flushes</li>
                        <li style={{ marginBottom: '5px' }}>• Extension Sets</li>
                      </ul>
                      <div className="infusion-type-tip" style={{ marginTop: '10px', padding: '8px', backgroundColor: '#fff3e0', borderRadius: '4px' }}>
                        <strong style={{ fontSize: '0.85rem' }}>➤ Key Identifier:</strong> <span style={{ fontSize: '0.85rem' }}>Look for Central Line Dressing Kit with Gripper Plus or Huber needle combo.</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Medication Selector Card */}
          <div className="dashboard-card medication-card">
            <div className="card-header">
              <h3>Select Medication</h3>
              <Package size={20} />
            </div>
            <div className="card-body">
              <div className="medication-grid">
                {Object.entries(suppliesData.medications).map(([key, medication]) => (
                  <button
                    key={key}
                    className={`medication-tile ${selectedMedication === key ? 'selected' : ''}`}
                    style={{
                      '--medication-color': medication.color,
                      borderColor: selectedMedication === key ? medication.color : 'transparent'
                    }}
                    onClick={() => setSelectedMedication(key)}
                  >
                    <div className="medication-icon" style={{ background: medication.color }}>
                      {medication.name.charAt(0)}
                    </div>
                    <span className="medication-name">{medication.name}</span>
                    {selectedMedication === key && (
                      <Check className="check-icon" size={16} style={{ color: medication.color }} />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Input Parameters Card */}
          {selectedMedication && suppliesData.medications[selectedMedication] && (
            <div className="dashboard-card input-card">
              <div className="card-header">
                <h3>Input Parameters for {suppliesData.medications[selectedMedication].name}</h3>
                <Calculator size={20} />
              </div>
              <div className="card-body">
                <div className="input-grid">
                  {renderMedicationInputs()}
                </div>
                
                {/* Validation Errors */}
                {validationErrors.length > 0 && (
                  <div className="validation-errors">
                    {validationErrors.map((error, idx) => (
                      <div key={idx} className="error-message">
                        <AlertCircle size={16} />
                        <span>{error}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="action-buttons">
            <button className="reset-btn" onClick={handleReset}>
              Reset All
            </button>
            <button 
              className="calculate-btn calculate-btn-always-active"
              onClick={calculateSupplies}
            >
              Calculate Supplies
            </button>
          </div>

          {/* Error Message Display */}
          {errorMessage && (
            <div className="error-message-banner">
              <AlertCircle size={16} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Results Dashboard */}
          {showResults && calculatedSupplies && (
            <div className="results-dashboard">
              {['CEREZYME', 'ELELYSO', 'NEXVIAZYME', 'XENPOZYME'].includes(selectedMedication) && (
                <div style={{background: '#f0f0f0', color: '#666', padding: '8px', marginBottom: '10px', borderRadius: '8px', textAlign: 'center', fontSize: '0.9rem'}}>
                  SPRX Quantity: {sprxQuantity || 0} (Minimum pharmacy can dispense)
                </div>
              )}
              <div className="results-header">
                <h2>Calculated Supplies</h2>
                <div>
                  {suppliesData.medications[selectedMedication] && (
                    <div className="medication-badge" style={{ background: suppliesData.medications[selectedMedication].color }}>
                      {suppliesData.medications[selectedMedication].name}
                    </div>
                  )}
                </div>
              </div>

              {/* Medication Information Card */}
              {medicationInfo && (
                <div className="medication-info-card">
                  <div className="info-grid">
                    {/* Filter Type */}
                    <div className="info-item">
                      <span className="info-label">Filter Type:</span>
                      <span className="info-value">{medicationInfo.filterType}</span>
                    </div>
                    
                    {/* Light Protection */}
                    {medicationInfo.requiresLightProtection && (
                      <div className="info-item">
                        <span className="info-label">Special Requirement:</span>
                        <span className="info-value highlight">Requires light protection (amber bags)</span>
                      </div>
                    )}
                    
                    {/* Manufacturer Specific */}
                    {medicationInfo.manufacturerNote && (
                      <div className="info-item">
                        <span className="info-label">Important:</span>
                        <span className="info-value highlight">{medicationInfo.manufacturerNote}</span>
                      </div>
                    )}
                    
                    {/* Special Notes */}
                    {medicationInfo.specialNotes.length > 0 && (
                      <div className="info-item full-width">
                        <span className="info-label">Notes:</span>
                        <div className="info-notes">
                          {medicationInfo.specialNotes.map((note, idx) => (
                            <span key={idx} className="note-item">{note}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Consult Notes */}
                    {medicationInfo.hasConsultNotes && (
                      <div className="info-item full-width">
                        <span className="info-label">Important:</span>
                        <span className="info-value highlight">Some supplies require RPH consultation - see notes in supply list</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Supply Categories */}
              <div className="supply-categories">
                {/* Base Supplies Section */}
                <div className="supply-category">
                  <div className="category-header">
                    <h4>Supplies Necessary to Administer {suppliesData.medications[selectedMedication].name}</h4>
                    <span className="category-count">{calculatedSupplies.baseSupplies.length} items</span>
                  </div>
                  <div className="supply-table">
                    <div className="table-header">
                      <div className="header-check"></div>
                      <div className="header-name">Supply Name</div>
                      <div className="header-irc">IRC</div>
                      <div className="header-qty">Qty</div>
                    </div>
                    <div className="table-body">
                      {calculatedSupplies.baseSupplies.map((supply, index) => {
                        const rowId = `base-${index}`;
                        const isChecked = checkedRows.has(rowId);
                        return (
                          <div 
                            key={index} 
                            className={`table-row ${supply.isConditional ? 'conditional' : ''} ${isChecked ? 'checked' : ''} ${isCompactView ? 'compact' : ''}`}
                            onClick={() => toggleRowCheck(rowId)}
                          >
                            <div className="row-check">
                              {isChecked && <Check size={16} />}
                            </div>
                            <div 
                              className="cell-name"
                              data-tooltip={supply.name + (supply.note ? ` • ${supply.note}` : '')}
                              title={supply.name}
                            >
                              {supply.name}
                              {supply.note && <span className="supply-note"> • {supply.note}</span>}
                            </div>
                            <div className="cell-irc">{supply.irc || 'N/A'}</div>
                            <div className="cell-qty">{supply.totalQuantity}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* IV Supplies Section */}
                {calculatedSupplies.ivSupplies.length > 0 && (
                  <div className="supply-category">
                    <div className="category-header">
                      <h4>{ivSuppliesType}</h4>
                      <span className="category-count">{calculatedSupplies.ivSupplies.length} items</span>
                    </div>
                    <div className="supply-table">
                      <div className="table-header">
                        <div className="header-check"></div>
                        <div className="header-name">Supply Name</div>
                        <div className="header-irc">IRC</div>
                        <div className="header-qty">Qty</div>
                      </div>
                      <div className="table-body">
                        {calculatedSupplies.ivSupplies.map((supply, index) => {
                          const rowId = `iv-${index}`;
                          const isChecked = checkedRows.has(rowId);
                          return (
                            <div 
                              key={index} 
                              className={`table-row ${supply.isConditional ? 'conditional' : ''} ${isChecked ? 'checked' : ''} ${isCompactView ? 'compact' : ''}`}
                              onClick={() => toggleRowCheck(rowId)}
                            >
                              <div className="row-check">
                                {isChecked && <Check size={16} />}
                              </div>
                              <div 
                                className="cell-name"
                                data-tooltip={supply.name + (supply.note ? ` • ${supply.note}` : '')}
                                title={supply.name}
                              >
                                {supply.name}
                                {supply.note && <span className="supply-note"> • {supply.note}</span>}
                              </div>
                              <div className="cell-irc">{supply.irc || 'N/A'}</div>
                              <div className="cell-qty">{supply.totalQuantity}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Gravity Supplies Section */}
                {gravityInfusion === 'Yes' && calculatedSupplies.gravitySupplies.length > 0 && (
                  <div className="supply-category">
                    <div className="category-header">
                      <h4>Gravity Supplies</h4>
                      <span className="category-count">{calculatedSupplies.gravitySupplies.length} items</span>
                    </div>
                    <div className="supply-table">
                      <div className="table-header">
                        <div className="header-check"></div>
                        <div className="header-name">Supply Name</div>
                        <div className="header-irc">IRC</div>
                        <div className="header-qty">Qty</div>
                      </div>
                      <div className="table-body">
                        {calculatedSupplies.gravitySupplies.map((supply, index) => {
                          const rowId = `gravity-${index}`;
                          const isChecked = checkedRows.has(rowId);
                          return (
                            <div 
                              key={index} 
                              className={`table-row ${supply.isConditional ? 'conditional' : ''} ${isChecked ? 'checked' : ''}`}
                              onClick={() => toggleRowCheck(rowId)}
                            >
                              <div className="row-check">
                                {isChecked && <Check size={16} />}
                              </div>
                              <div 
                                className="cell-name"
                                data-tooltip={supply.name + (supply.note ? ` • ${supply.note}` : '')}
                                title={supply.name}
                              >
                                {supply.name}
                                {supply.note && <span className="supply-note"> • {supply.note}</span>}
                              </div>
                              <div className="cell-irc">{supply.irc || 'N/A'}</div>
                              <div className="cell-qty">{supply.totalQuantity}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Standard DR/CVS Supplies Section */}
                <div className="supply-category">
                  <div className="category-header">
                    <h4>Dr CVS Supplies</h4>
                    <span className="category-count">{calculatedSupplies.standardSupplies.length} items</span>
                  </div>
                  <div className="supply-table">
                    <div className="table-header">
                      <div className="header-check"></div>
                      <div className="header-name">Supply Name</div>
                      <div className="header-irc">IRC</div>
                      <div className="header-qty">Qty</div>
                    </div>
                    <div className="table-body">
                      {calculatedSupplies.standardSupplies.map((supply, index) => {
                        const rowId = `standard-${index}`;
                        const isChecked = checkedRows.has(rowId);
                        return (
                          <div 
                            key={index} 
                            className={`table-row ${supply.isConditional ? 'conditional' : ''} ${isChecked ? 'checked' : ''} ${isCompactView ? 'compact' : ''}`}
                            onClick={() => toggleRowCheck(rowId)}
                          >
                            <div className="row-check">
                              {isChecked && <Check size={16} />}
                            </div>
                            <div 
                              className="cell-name"
                              data-tooltip={supply.name + (supply.note ? ` • ${supply.note}` : '')}
                              title={supply.name}
                            >
                              {supply.name}
                              {supply.note && <span className="supply-note"> • {supply.note}</span>}
                            </div>
                            <div className="cell-irc">{supply.irc || 'N/A'}</div>
                            <div className="cell-qty">{supply.totalQuantity}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* ADR Supplies Section */}
                {adrPremedsRequired === 'YES' && calculatedSupplies.adrSupplies.length > 0 && (
                  <div className="supply-category">
                    <div className="category-header">
                      <h4>Pre-Meds/ADR Meds (RX NEEDED)</h4>
                      <span className="category-count">{calculatedSupplies.adrSupplies.length} items</span>
                    </div>
                    <div className="supply-table">
                      <div className="table-header">
                        <div className="header-check"></div>
                        <div className="header-name">Supply Name</div>
                        <div className="header-irc">IRC</div>
                        <div className="header-qty">Qty</div>
                      </div>
                      <div className="table-body">
                        {calculatedSupplies.adrSupplies.map((supply, index) => {
                          const rowId = `adr-${index}`;
                          const isChecked = checkedRows.has(rowId);
                          return (
                            <div 
                              key={index} 
                              className={`table-row ${supply.isConditional ? 'conditional' : ''} ${isChecked ? 'checked' : ''}`}
                              onClick={() => toggleRowCheck(rowId)}
                            >
                              <div className="row-check">
                                {isChecked && <Check size={16} />}
                              </div>
                              <div 
                                className="cell-name"
                                data-tooltip={supply.name + (supply.note ? ` • ${supply.note}` : '')}
                                title={supply.name}
                              >
                                {supply.name}
                                {supply.note && <span className="supply-note"> • {supply.note}</span>}
                              </div>
                              <div className="cell-irc">{supply.irc || 'N/A'}</div>
                              <div className="cell-qty">{supply.totalQuantity}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Supplies;