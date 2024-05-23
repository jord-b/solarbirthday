document.getElementById('calculate').addEventListener('click', function() {
    const birthday = document.getElementById('birthday').value;
    const birthtime = document.getElementById('birthtime').value;
  
    if (!birthday || !birthtime) {
      alert('Please enter both your birthday and birth time.');
      return;
    }
  
    const birthDateTime = new Date(`${birthday}T${birthtime}:00`);
    const siderealYearMs = 365 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000 + 9 * 60 * 1000 + 10 * 1000;
  
    const tbody = document.getElementById('results').getElementsByTagName('tbody')[0];
    tbody.innerHTML = '';
  
    const today = new Date();
    let currentYear = 0;
    let nextBirthday = new Date(birthDateTime.getTime());
  
    // Find the next upcoming birthday
    while (nextBirthday <= today) {
      currentYear++;
      nextBirthday = new Date(birthDateTime.getTime() + siderealYearMs * currentYear);
    }
  
    // Format the next birthday
    const options = { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true };
    const nextBirthdayText = nextBirthday.toLocaleString('en-US', options);
  
    document.getElementById('nextBirthdayLabel').textContent = `Your next Solar Birthday (${currentYear} laps around the sun):`;
    document.getElementById('nextBirthday').textContent = nextBirthdayText;
  
    // Add the next 100 birthdays to the table
    for (let i = 0; i < 101; i++) {
      const revolutionDateTime = new Date(birthDateTime.getTime() + siderealYearMs * i);
      const revolutionTime = revolutionDateTime.toLocaleString('en-US', options);
  
      const row = tbody.insertRow();
      row.insertCell(0).textContent = revolutionDateTime.getFullYear();
      row.insertCell(1).textContent = i;
      row.insertCell(2).textContent = revolutionTime;
    }
  
    // Show the table
    document.getElementById('results').style.display = 'table';
  });
  