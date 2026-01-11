/**
 * Sub-Agent Test Script
 *
 * Test individual sub-agents to ensure they work correctly.
 */

import { searchFlights } from './mastra/agents/flight-search';
import { searchAccommodation } from './mastra/agents/accommodation-search';
import { searchAttractions } from './mastra/agents/attraction-search';
import { searchRestaurants } from './mastra/agents/restaurant-search';
import { optimizeRoute } from './mastra/agents/route-optimization';

async function testSubAgents() {
  const apiKey = process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    console.error('❌ GOOGLE_API_KEY not found');
    process.exit(1);
  }

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         Sub-Agent Test Suite                               ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // Test 1: Flight Search
    console.log('✈️  Test 1: Flight Search Agent');
    console.log('─────────────────────────────────────────────────────────────');
    const flightResult = await searchFlights(
      {
        origin: '東京',
        destination: '上海',
        start_date: '2026-01-20',
        end_date: '2026-01-23',
        passengers: 1,
      },
      apiKey
    );

    console.log('Flight Options:');
    flightResult.options.forEach((option, i) => {
      console.log(`\n  ${i + 1}. ${option.airline}`);
      console.log(`     Outbound: ${option.outbound}`);
      console.log(`     Return: ${option.return}`);
      console.log(`     Price: ¥${option.price}`);
      console.log(`     Duration: ${option.duration_hours} hours`);
    });
    console.log(`\n  💡 ${flightResult.recommendations}`);
    console.log('\n✅ Flight search successful!\n');

    // Test 2: Accommodation Search
    console.log('🏨 Test 2: Accommodation Search Agent');
    console.log('─────────────────────────────────────────────────────────────');
    const hotelResult = await searchAccommodation(
      {
        destination: '上海',
        check_in: '2026-01-20',
        check_out: '2026-01-23',
        daily_concepts: [
          { day: 1, date: '2026-01-20', area: '外灘', theme: '到着日・軽め' },
          { day: 2, date: '2026-01-21', area: '外灘', theme: '歴史と夜景' },
          { day: 3, date: '2026-01-22', area: '浦東', theme: 'モダン上海' },
        ],
      },
      apiKey
    );

    console.log('Hotel Options:');
    hotelResult.options.forEach((option, i) => {
      console.log(`\n  ${i + 1}. ${option.name}`);
      console.log(`     Area: ${option.area}`);
      console.log(`     Price: ¥${option.price_per_night}/night`);
      console.log(`     Rating: ${option.rating}/5.0`);
      console.log(`     Amenities: ${option.amenities?.join(', ')}`);
    });
    console.log(`\n  💡 ${hotelResult.recommendation}`);
    console.log(`\n  📍 Location rationale: ${hotelResult.location_rationale}`);
    console.log('\n✅ Accommodation search successful!\n');

    // Test 3: Attraction Search
    console.log('🎯 Test 3: Attraction Search Agent');
    console.log('─────────────────────────────────────────────────────────────');
    const attractionResult = await searchAttractions(
      {
        destination: '上海',
        area: '外灘',
        theme: '歴史と夜景',
        available_hours: 8,
        date: '2026-01-21',
      },
      apiKey
    );

    console.log('Attractions:');
    attractionResult.attractions.forEach((attraction, i) => {
      console.log(`\n  ${i + 1}. ${attraction.name}`);
      console.log(`     ${attraction.description}`);
      console.log(`     Duration: ${attraction.visit_duration_minutes} min`);
      console.log(`     Hours: ${attraction.business_hours}`);
      console.log(`     Fee: ¥${attraction.entry_fee || 0}`);
      console.log(`     Rating: ${attraction.rating}/5.0`);
    });
    console.log(`\n  💡 ${attractionResult.summary}`);
    console.log('\n✅ Attraction search successful!\n');

    // Test 4: Restaurant Search
    console.log('🍽️  Test 4: Restaurant Search Agent');
    console.log('─────────────────────────────────────────────────────────────');
    const restaurantResult = await searchRestaurants(
      {
        destination: '上海',
        area: '外灘',
        meal_type: 'dinner',
        cuisine: '上海料理',
        date: '2026-01-21',
      },
      apiKey
    );

    console.log('Restaurants:');
    restaurantResult.restaurants.forEach((restaurant, i) => {
      console.log(`\n  ${i + 1}. ${restaurant.name}`);
      console.log(`     Cuisine: ${restaurant.cuisine}`);
      console.log(`     ${restaurant.description}`);
      console.log(`     Price: ${restaurant.price_range}`);
      console.log(`     Hours: ${restaurant.business_hours}`);
      console.log(`     Rating: ${restaurant.rating}/5.0`);
    });
    console.log(`\n  💡 ${restaurantResult.recommendation}`);
    console.log(`\n  🥘 Local specialties: ${restaurantResult.local_specialties.join(', ')}`);
    console.log('\n✅ Restaurant search successful!\n');

    // Test 5: Route Optimization
    console.log('🗺️  Test 5: Route Optimization Agent');
    console.log('─────────────────────────────────────────────────────────────');

    // Use first 3 attractions from previous search
    const selectedAttractions = attractionResult.attractions.slice(0, 3);
    const selectedRestaurant = restaurantResult.restaurants[0];

    // Debug: Check if location property exists
    console.log('\n🔍 Debug: Checking location data...');
    console.log('First attraction:', JSON.stringify(selectedAttractions[0], null, 2));
    console.log('Restaurant:', JSON.stringify(selectedRestaurant, null, 2));

    const routeResult = await optimizeRoute(
      {
        attractions: selectedAttractions,
        restaurants: {
          lunch: selectedRestaurant,
          dinner: selectedRestaurant,
        },
        hotel_location: { lat: 31.2400, lng: 121.4900 },
        start_time: '09:00',
        end_time: '21:00',
        date: '2026-01-21',
      },
      apiKey
    );

    console.log('Optimized Timeline:');
    routeResult.timeline.forEach((activity) => {
      const icon = {
        hotel: '🏨',
        sightseeing: '🎯',
        meal: '🍽️',
        transport: '🚶',
      }[activity.activity_type] || '📍';

      console.log(`\n  ${activity.start_time} - ${activity.end_time} ${icon} ${activity.name}`);
      if (activity.description) {
        console.log(`     ${activity.description}`);
      }
    });

    console.log(`\n  📊 Total duration: ${routeResult.total_duration_minutes} min (${(routeResult.total_duration_minutes / 60).toFixed(1)} hours)`);
    console.log(`  🚶 Total distance: ${routeResult.total_walking_distance_km.toFixed(1)} km`);
    console.log(`\n  💡 ${routeResult.summary}`);

    if (routeResult.warnings && routeResult.warnings.length > 0) {
      console.log(`\n  ⚠️  Warnings:`);
      routeResult.warnings.forEach((warning) => {
        console.log(`     - ${warning}`);
      });
    }

    console.log('\n✅ Route optimization successful!\n');

    console.log('═══════════════════════════════════════════════════════════');
    console.log('🎉 All sub-agent tests passed!');
    console.log('═══════════════════════════════════════════════════════════\n');
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testSubAgents();
