export const generateGPX = (routeData) => {
    const { name, points, startTime } = routeData;

    let gpxContent = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="TrafficSpeed Analytics">
  <metadata>
    <name>${name}</name>
    <time>${startTime}</time>
  </metadata>
  <trk>
    <name>${name}</name>
    <trkseg>
`;

    points.forEach(point => {
        gpxContent += `      <trkpt lat="${point.lat}" lon="${point.lon}">
        <ele>${point.ele || 0}</ele>
        <time>${point.time}</time>
        <extensions>
          <speed>${point.speed}</speed>
        </extensions>
      </trkpt>
`;
    });

    gpxContent += `    </trkseg>
  </trk>
</gpx>`;

    return gpxContent;
};

export const parseGPX = (gpxText) => {
    try {
        const parser = new DOMParser();
        const gpxDoc = parser.parseFromString(gpxText, 'text/xml');
        const trkpts = gpxDoc.querySelectorAll('trkpt');

        const points = Array.from(trkpts).map(pt => {
            const speedEl = pt.querySelector('speed');
            return {
                lat: parseFloat(pt.getAttribute('lat')),
                lon: parseFloat(pt.getAttribute('lon')),
                speed: speedEl ? parseFloat(speedEl.textContent) : 0,
                time: pt.querySelector('time')?.textContent || new Date().toISOString()
            };
        });

        return points;
    } catch (error) {
        console.error('Error parsing GPX:', error);
        return [];
    }
};
