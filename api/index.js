import fetch from 'node-fetch';
import protobuf from 'protobufjs';
import path from 'path';

export default async function handler(req, res) {
  const url = 'https://proxy.transport.data.gouv.fr/resource/fluo-citura-reims-gtfs-rt';

  try {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();

    const root = await protobuf.load(path.join(process.cwd(), 'api', 'gtfs-realtime.proto'));
    const FeedMessage = root.lookupType('transit_realtime.FeedMessage');
    const feed = FeedMessage.decode(new Uint8Array(buffer));

    const results = [];

    for (const entity of feed.entity) {
      let position = null;

      if (entity.vehicle && entity.vehicle.position) {
        position = {
          lat: entity.vehicle.position.latitude,
          lon: entity.vehicle.position.longitude
        };
      }

      if (entity.tripUpdate && entity.tripUpdate.stopTimeUpdate) {
        for (const stop of entity.tripUpdate.stopTimeUpdate) {
          results.push({
            routeId: entity.tripUpdate.trip?.routeId,
            stopId: stop.stopId,
            stopName: stop.stopId, // Améliorable avec mapping
            arrivalTime: stop.arrival?.time ?? stop.departure?.time,
            position // null si non défini
          });
        }
      }
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur de récupération ou décodage GTFS' });
  }
}
