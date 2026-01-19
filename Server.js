// index.js
const express = require('express');
const cors = require('cors');  
const pool = require('./db');

const app = express();
const PORT = 3000;
app.use(cors());  
app.use(express.json());


/**
 * GET /stations
 * returns id, name, code, city, system, is_interchange
 */
app.get('/stations', (req, res) => {
  const sql = 'SELECT station_id, name, code, city, systemm, is_interchange FROM stations ORDER BY name';

  pool.query(sql, (err, rows) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json(rows);
  });
});

/**
 * GET /route?from=MEERUT_S_R&to=MODIPURAM_R
 * returns hops + totals (distance, time, fare)
 */
app.get('/route', (req, res) => {
  const fromCode = req.query.from;
  const toCode = req.query.to;

  if (!fromCode || !toCode) {
    return res.status(400).json({ error: 'from and to are required' });
  }

  const getStationsSql = 'SELECT station_id, code FROM stations WHERE code IN (?, ?)';
  pool.query(getStationsSql, [fromCode, toCode], (err, stations) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    if (stations.length < 2) {
      return res.status(404).json({ error: 'Stations not found' });
    }

    const fromStation = stations.find(s => s.code === fromCode);
    const toStation = stations.find(s => s.code === toCode);

    const fromId = fromStation.station_id;
    const toId = toStation.station_id;

    const minId = Math.min(fromId, toId);
    const maxId = Math.max(fromId, toId);

    const linksSql = `
      SELECT
        sl.*,
        s1.name AS from_name,
        s2.name AS to_name
      FROM station_links sl
      JOIN stations s1 ON sl.from_station_id = s1.station_id
      JOIN stations s2 ON sl.to_station_id = s2.station_id
      WHERE sl.from_station_id >= ? AND sl.to_station_id <= ?
      ORDER BY sl.from_station_id ASC
    `;

    pool.query(linksSql, [minId, maxId], (err2, links) => {
      if (err2) return res.status(500).json({ error: 'DB error' });
      if (!links.length) return res.status(404).json({ error: 'No route found' });

      // If reverse direction, reverse links
      const pathLinks = fromId <= toId ? links : links.slice().reverse();

      const totals = pathLinks.reduce(
        (acc, link) => {
          acc.distance_km += Number(link.distance_km);
          acc.travel_time_min += link.travel_time_min;
          acc.base_fare += link.base_fare;
          return acc;
        },
        { distance_km: 0, travel_time_min: 0, base_fare: 0 }
      );

      res.json({
        from: fromCode,
        to: toCode,
        hops: pathLinks.map(l => ({
          from_station_id: l.from_station_id,
          from_name: l.from_name,
          to_station_id: l.to_station_id,
          to_name: l.to_name,
          distance_km: l.distance_km,
          travel_time_min: l.travel_time_min,
          base_fare: l.base_fare,
          platform_from: l.platform_from,
          platform_to: l.platform_to,
          line_name: l.line_name,
          is_rapid: !!l.is_rapid,
        })),
        totals,
      });
    });
  });
});

app.listen(PORT, () => {
  console.log(`API running at http://localhost:${PORT}`);
});
