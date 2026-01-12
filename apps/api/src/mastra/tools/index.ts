/**
 * Tool Aggregation (OpenAI-only)
 *
 * Exports all tools for easy import in Mastra config.
 */

import { createFlightSearchTool } from './flight-search-tool';
import { createAccommodationSearchTool } from './accommodation-search-tool';
import { createAttractionSearchTool } from './attraction-search-tool';
import { createRestaurantSearchTool } from './restaurant-search-tool';
import { createRouteOptimizationTool } from './route-optimization-tool';
import { createDistanceCalculationTool } from './distance-calculation-tool';
import { createWebSearchTool } from './web-search-tool';

export function getAllTools(apiKey: string) {
  return {
    flightSearch: createFlightSearchTool(apiKey),
    accommodationSearch: createAccommodationSearchTool(apiKey),
    attractionSearch: createAttractionSearchTool(apiKey),
    restaurantSearch: createRestaurantSearchTool(apiKey),
    routeOptimization: createRouteOptimizationTool(apiKey),
    distanceCalculation: createDistanceCalculationTool(apiKey),
    webSearch: createWebSearchTool(apiKey),
  };
}
