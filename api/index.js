import fetch from 'node-fetch';
import protobuf from 'protobufjs';
import path from 'path';

export default async function handler(req, res) {
  const gtfsRtUrl = 'https://proxy.transport.data.gouv.fr/resource/fluo-citura-reims-gtfs-rt';

  try {
    const response = await fetch(gtfsRtUrl);
    const buffer = await response.arrayBuffer();

    const root = await protobuf.load(path.join(process.cwd(), 'api', 'gtfs-realtime.proto'));
    const FeedMessage = root.lookupType('transit_realtime.FeedMessage');

    const feed = FeedMessage.decode(new Uint8Array(buffer));
    const departures = [];

    for (const entity of feed.entity) {
      if (!entity.tripUpdate || !entity.tripUpdate.stopTimeUpdate) continue;

      for (const stopTime of entity.tripUpdate.stopTimeUpdate) {
        departures.push({
          stopId: stopTime.stopId,
          arrivalTime: stopTime.arrival?.time || stopTime.departure?.time,
          routeId: entity.tripUpdate.trip?.routeId
        });
      }
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json(departures);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur de récupération ou décodage GTFS' });
  }
}
