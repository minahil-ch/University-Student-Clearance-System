const url = "https://owmaqahzvmoofvbvpdmz.supabase.co/rest/v1/";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93bWFxYWh6dm1vb2Z2YnZwZG16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3OTEyMjksImV4cCI6MjA5MTM2NzIyOX0.BvC8XdYd_JaJAT-HgKXXaA8XT8I7fpSdjry7rHvNvCM";

fetch(url, {
  headers: { "apikey": key }
})
.then(r => console.log("Status:", r.status))
.catch(e => console.error("Connectivity Error:", e.message));
