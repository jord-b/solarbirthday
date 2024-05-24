document.addEventListener('DOMContentLoaded', function() {
  const today = new Date();
  
  // Get the current date in the format YYYY-MM-DD
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0'); // Months are zero-based, so add 1
  const day = String(today.getDate()).padStart(2, '0');

  const formattedDate = `${year}-${month}-${day}`;
  
  // Set the value of the birthday input to today's date
  document.getElementById('birthday').value = formattedDate;
});


document.getElementById('calculate').addEventListener('click', function() {
    const birthday = document.getElementById('birthday').value;
    const birthtime = document.getElementById('birthtime').value;
  
    if (!birthday || !birthtime) {
      alert('Please enter both your birthday and birth time.');
      return;
    }
  
    // Call Lambda function through API Gateway
    fetch('https://kxy97vglij.execute-api.us-east-2.amazonaws.com/logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
        // 'x-api-key': 'YOUR_API_KEY' // if using API keys
      },
      body: JSON.stringify({
        "birthDate": birthday,
        "birthTime": birthtime
      })
    })
    .then(response => response.json())
    .then(data => console.log('Success:', data))
    .catch(error => console.error('Error:', error));
  
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
    const lapsText = currentYear === 1 ? 'lap' : 'laps'
    document.getElementById('nextBirthdayLabel').textContent = `Your next Solar Birthday (${currentYear} ${lapsText} around the sun):`;
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
  