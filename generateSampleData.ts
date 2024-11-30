const XLSX = require('xlsx');

// Generate sample data
const sampleStudents = [
  {
    admissiondate: "01/06/2024",
    admissionno: "2024001",
    name: "Rahul Kumar",
    address: "123 Main Street",
    city: "Delhi",
    village: "Greater Kailash",
    Sex: "Male",
    birthday: "15/08/2012",
    nationality: "Indian",
    Religion: "Hindu",
    tongue: "Hindi",
    category: "General",
    mothername: "Priya Kumar",
    mphone: "9876543210",
    moccupation: "Teacher",
    fathername: "Rajesh Kumar",
    fphone: "9876543211",
    foccupation: "Business",
    aadharcard: "123456789012",
    house: "Blue",
    bloodgroup: "O+",
    previousClass: "5th",
    yearofpass: "2023",
    board: "CBSE",
    school: "Delhi Public School",
    grade: "A",
    classId: "6",
    sectionId: "A",
    sessionId: "2024"
  },
  {
    admissiondate: "01/06/2024",
    admissionno: "2024002",
    name: "Priya Singh",
    address: "456 Park Road",
    city: "Mumbai",
    village: "Andheri",
    Sex: "Female",
    birthday: "20/09/2012",
    nationality: "Indian",
    Religion: "Sikh",
    tongue: "Punjabi",
    category: "General",
    mothername: "Harpreet Kaur",
    mphone: "9876543212",
    moccupation: "Doctor",
    fathername: "Gurpreet Singh",
    fphone: "9876543213",
    foccupation: "Engineer",
    aadharcard: "123456789013",
    house: "Red",
    bloodgroup: "B+",
    previousClass: "5th",
    yearofpass: "2023",
    board: "CBSE",
    school: "Ryan International School",
    grade: "A+",
    classId: "6",
    sectionId: "B",
    sessionId: "2024"
  }
];

// Create workbook
const workbook = XLSX.utils.book_new();

// Convert data to worksheet
const worksheet = XLSX.utils.json_to_sheet(sampleStudents);

// Add worksheet to workbook
XLSX.utils.book_append_sheet(workbook, worksheet, "Students");

// Write to file
XLSX.writeFile(workbook, "sample_students.xlsx");

console.log("Excel file 'sample_students.xlsx' has been created successfully!");
console.log("\nSample data structure:");
console.log(JSON.stringify(sampleStudents[0], null, 2));