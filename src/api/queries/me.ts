import { queryOptions } from "@tanstack/react-query"
import { api, unwrap } from "../client"
import { toMe } from "../types"

export const meQuery = () =>
	queryOptions({
		queryKey: ["me"],
		queryFn: async () => toMe(await unwrap(api.GET("/v1/me"))),
		staleTime: 5 * 60_000,
	})
