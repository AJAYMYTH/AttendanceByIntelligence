const xlsx = require('xlsx');
const path = require('path');

const data = [
    { 'Students Name': 'Test Student 1', 'Register Number': 'T001' },
    { 'Students Name': 'Test Student 2', 'Register Number': 'T002' },
    { 'Students Name': 'Test Student 3', 'Register Number': 'T003' }
];

const workbook = xlsx.utils.book_new();
const worksheet = xlsx.utils.json_to_sheet(data);
xlsx.utils.book_append_sheet(workbook, worksheet, 'Students');

const filePath = path.join(__dirname, 'dummy_students.xlsx');
xlsx.writeFile(workbook, filePath);
console.log('Dummy students file created at:', filePath);
