const { db } = require('../server/db'); db.prepare("DELETE FROM clients WHERE name = 'Demo Dental Clinic'").run(); console.log('Deleted demo client');
