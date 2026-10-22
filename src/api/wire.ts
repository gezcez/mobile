// wire.ts
// One namespace for wire (snake_case) shapes: generated DTOs from openapi.json plus the hand-typed
// schemas of endpoints the backend has not published yet. Mappers (types.ts) and the mock use these.

import type { components } from "./schema.gen"
import type { ManualSchemas } from "./schema.manual"

/**
 * openapi-fetch hands responses back with tuples widened to arrays ([lon, lat] becomes number[]),
 * so the wire types are widened the same way and mappers check lengths themselves.
 */
type Untuple<T> = T extends readonly [unknown, ...unknown[]]
	? Untuple<T[number]>[]
	: T extends readonly (infer U)[]
		? Untuple<U>[]
		: T extends object
			? { [K in keyof T]: Untuple<T[K]> }
			: T

type G = Untuple<components["schemas"]>

export type W = ManualSchemas & {
	City: G["CityDto"]
	NetworkSummary: G["CityDto"]["networks"][number]
	CityManifest: G["CityManifestDto"]
	ManifestNetwork: G["CityManifestDto"]["networks"][number]
	Network: G["NetworkManifestDto"]
	Capabilities: G["CityManifestDto"]["networks"][number]["capabilities"]
	RouteSummary: G["DeparturesDto"]["items"][number]["route"]
	StopSummary: G["DeparturesDto"]["stop"]
	Stop: G["StopDetailDto"]
	Departure: G["DeparturesDto"]["items"][number]
	Departures: G["DeparturesDto"]
	Route: G["RouteDetailDto"]
	Shape: G["RouteShapeDto"]
	Timetable: G["TimetableDto"]
	DayType: G["TimetableDto"]["day_type"]
	Search: G["SearchResultDto"]
	Nearby: G["NearbyDto"]
	VehiclesSnapshot: G["VehicleSnapshotDto"]
	VehicleRow: G["VehicleSnapshotDto"]["vehicles"][number]
	Vehicle: G["VehicleDetailDto"]
	VehicleRun: G["VehicleDetailDto"]["runs_today"][number]
	Me: G["MeDto"]
	Pack: G["PackDto"]
	PackStop: G["PackDto"]["stops"][number]
	PackRoute: G["PackDto"]["routes"][number]
	PackDirection: G["PackDto"]["routes"][number]["directions"][number]
	Alert: G["AlertDto"]
	FavouritesDoc: G["FavouritesDocDto"]
	FavouriteGroup: G["FavouritesDocDto"]["groups"][number]
	FavouriteItem: G["FavouritesDocDto"]["groups"][number]["items"][number]
	PutFavourites: G["PutFavouritesDto"]
	TelemetryCounters: G["TelemetryCountersDto"]
	WsClientMessage: G["WsClientMessage"]
	WsServerMessage: G["WsServerMessage"]
}
