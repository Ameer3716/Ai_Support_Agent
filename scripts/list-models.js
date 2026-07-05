fetch('https://generativelanguage.googleapis.com/v1beta/models?key=YOUR_API_KEY').then(res => res.json()).then(data => console.log(JSON.stringify(data, null, 2)));
