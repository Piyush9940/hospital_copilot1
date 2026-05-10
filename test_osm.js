async function test() {
    const lat = 13.1291;
    const lng = 77.5878;
    const query = `[out:json];nwr(around:5000,${lat},${lng})[amenity=hospital];out center;`;
    const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
    
    try {
        const response = await fetch(url, { headers: { 'User-Agent': 'HospitalCopilot/1.0' }});
        const data = await response.json();
        console.log("Elements found:", data.elements.length);
        if (data.elements.length > 0) {
            console.log(JSON.stringify(data.elements.slice(0, 3), null, 2));
        }
    } catch(e) {
        console.error(e);
    }
}
test();
