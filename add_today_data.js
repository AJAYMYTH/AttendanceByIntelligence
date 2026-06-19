const supabase = require('./src/utils/supabase');

async function addDummyData() {
    const today = new Date().toISOString().split('T')[0];
    
    // Get some students
    const { data: students } = await supabase.from('students').select('id, section').limit(5);
    
    if (!students || students.length === 0) {
        console.log('No students found to add attendance for.');
        return;
    }

    const records = students.map(s => ({
        student_id: s.id,
        attendance_date: today,
        status: Math.random() > 0.2 ? 'PRESENT' : 'ABSENT',
        section: s.section,
        recorded_by: '9ffa63f5-2076-46eb-8c7b-c0d46662833b' // Admin UUID
    }));

    const { error } = await supabase.from('attendance_records').upsert(records, { onConflict: 'student_id,attendance_date' });

    if (error) {
        console.error('Error adding dummy data:', error);
    } else {
        console.log(`Added ${records.length} attendance records for ${today}`);
    }
}

addDummyData();
