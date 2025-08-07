#!/usr/bin/env tsx
/**
 * API Validation Script for IncidentIQ MCP Server
 * Tests corrected API patterns against production instance
 * READ-ONLY operations only for safety
 */

import * as dotenv from 'dotenv';
import { IncidentIQClient } from '../src/api/client.js';
import path from 'path';
import fs from 'fs';

// Load environment from context/config/.env
const envPath = path.join(process.cwd(), 'context', 'config', '.env');
console.log(`Loading config from: ${envPath}`);

// Read and parse the .env file manually since it seems to have issues
const envContent = fs.readFileSync(envPath, 'utf-8');
const envLines = envContent.split('\n');

for (const line of envLines) {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    // Look for lines with = sign
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex > 0) {
      const key = trimmed.substring(0, eqIndex).trim();
      const value = trimmed.substring(eqIndex + 1).trim();
      process.env[key] = value;
    }
  }
}

interface TestResult {
  endpoint: string;
  method: string;
  status: 'success' | 'failure' | 'empty';
  message: string;
  data?: any;
}

const results: TestResult[] = [];

async function validateAPI() {
  console.log('🔍 IncidentIQ API Validation Test');
  console.log('=' .repeat(50));
  
  // Initialize client
  const client = new IncidentIQClient(
    process.env.IIQ_API_BASE_URL,
    process.env.IIQ_API_KEY
  );
  
  console.log(`📍 API Endpoint: ${process.env.IIQ_API_BASE_URL}`);
  console.log(`🔐 Using API key: ${process.env.IIQ_API_KEY?.substring(0, 20)}...`);
  console.log('=' .repeat(50));

  // Test 1: Connection Test
  console.log('\n1️⃣ Testing Connection...');
  try {
    const connection = await client.testConnection();
    results.push({
      endpoint: '/tickets/statuses',
      method: 'GET',
      status: connection.connected ? 'success' : 'failure',
      message: connection.connected 
        ? `Connected to ${connection.districtName}` 
        : connection.error || 'Connection failed',
      data: connection
    });
    console.log(connection.connected ? '✅ Connected' : '❌ Failed');
  } catch (error: any) {
    results.push({
      endpoint: '/tickets/statuses',
      method: 'GET',
      status: 'failure',
      message: error.message
    });
    console.log('❌ Error:', error.message);
  }

  // Test 2: Search Tickets
  console.log('\n2️⃣ Testing Ticket Search (POST /tickets)...');
  try {
    const tickets = await client.searchTickets({
      PageSize: 5,
      PageIndex: 0
    });
    const hasResults = tickets.Items && tickets.Items.length > 0;
    results.push({
      endpoint: '/tickets',
      method: 'POST',
      status: hasResults ? 'success' : 'empty',
      message: `Found ${tickets.Items?.length || 0} tickets`,
      data: { count: tickets.Items?.length, sample: tickets.Items?.[0] }
    });
    console.log(`${hasResults ? '✅' : '⚠️'} Found ${tickets.Items?.length || 0} tickets`);
  } catch (error: any) {
    results.push({
      endpoint: '/tickets',
      method: 'POST',
      status: 'failure',
      message: error.message
    });
    console.log('❌ Error:', error.message);
  }

  // Test 3: Get Ticket Statuses
  console.log('\n3️⃣ Testing Ticket Statuses (GET /tickets/statuses)...');
  try {
    const statuses = await client.getTicketStatuses();
    const hasResults = statuses && statuses.length > 0;
    results.push({
      endpoint: '/tickets/statuses',
      method: 'GET',
      status: hasResults ? 'success' : 'empty',
      message: `Found ${statuses?.length || 0} statuses`,
      data: statuses
    });
    console.log(`${hasResults ? '✅' : '⚠️'} Found ${statuses?.length || 0} statuses`);
  } catch (error: any) {
    results.push({
      endpoint: '/tickets/statuses',
      method: 'GET',
      status: 'failure',
      message: error.message
    });
    console.log('❌ Error:', error.message);
  }

  // Test 4: Search Users
  console.log('\n4️⃣ Testing User Search (POST /users)...');
  try {
    const users = await client.searchUsers({
      PageSize: 5,
      PageIndex: 0
    });
    const hasResults = users.Items && users.Items.length > 0;
    results.push({
      endpoint: '/users',
      method: 'POST',
      status: hasResults ? 'success' : 'empty',
      message: `Found ${users.Items?.length || 0} users`,
      data: { count: users.Items?.length, sample: users.Items?.[0] }
    });
    console.log(`${hasResults ? '✅' : '⚠️'} Found ${users.Items?.length || 0} users`);
  } catch (error: any) {
    results.push({
      endpoint: '/users',
      method: 'POST',
      status: 'failure',
      message: error.message
    });
    console.log('❌ Error:', error.message);
  }

  // Test 5: Get Agents
  console.log('\n5️⃣ Testing Get Agents (GET /users/agents)...');
  try {
    const agents = await client.getAgents();
    const hasResults = agents && agents.length > 0;
    results.push({
      endpoint: '/users/agents',
      method: 'GET',
      status: hasResults ? 'success' : 'empty',
      message: `Found ${agents?.length || 0} agents`,
      data: { count: agents?.length, sample: agents?.[0] }
    });
    console.log(`${hasResults ? '✅' : '⚠️'} Found ${agents?.length || 0} agents`);
  } catch (error: any) {
    results.push({
      endpoint: '/users/agents',
      method: 'GET',
      status: 'failure',
      message: error.message
    });
    console.log('❌ Error:', error.message);
  }

  // Test 6: Search Assets
  console.log('\n6️⃣ Testing Asset Search (POST /assets)...');
  try {
    const assets = await client.searchAssets({
      PageSize: 5,
      PageIndex: 0
    });
    const hasResults = assets.Items && assets.Items.length > 0;
    results.push({
      endpoint: '/assets',
      method: 'POST',
      status: hasResults ? 'success' : 'empty',
      message: `Found ${assets.Items?.length || 0} assets`,
      data: { count: assets.Items?.length, sample: assets.Items?.[0] }
    });
    console.log(`${hasResults ? '✅' : '⚠️'} Found ${assets.Items?.length || 0} assets`);
  } catch (error: any) {
    results.push({
      endpoint: '/assets',
      method: 'POST',
      status: 'failure',
      message: error.message
    });
    console.log('❌ Error:', error.message);
  }

  // Test 7: Get All Locations
  console.log('\n7️⃣ Testing Get All Locations (GET /locations/all)...');
  try {
    const locations = await client.getAllLocations();
    const hasResults = locations && locations.length > 0;
    results.push({
      endpoint: '/locations/all',
      method: 'GET',
      status: hasResults ? 'success' : 'empty',
      message: `Found ${locations?.length || 0} locations`,
      data: { count: locations?.length, sample: locations?.[0] }
    });
    console.log(`${hasResults ? '✅' : '⚠️'} Found ${locations?.length || 0} locations`);
  } catch (error: any) {
    results.push({
      endpoint: '/locations/all',
      method: 'GET',
      status: 'failure',
      message: error.message
    });
    console.log('❌ Error:', error.message);
  }

  // Test 8: Search Locations
  console.log('\n8️⃣ Testing Location Search (POST /locations)...');
  try {
    const locations = await client.searchLocations({
      PageSize: 5,
      PageIndex: 0
    });
    const hasResults = locations.Items && locations.Items.length > 0;
    results.push({
      endpoint: '/locations',
      method: 'POST',
      status: hasResults ? 'success' : 'empty',
      message: `Found ${locations.Items?.length || 0} locations`,
      data: { count: locations.Items?.length, sample: locations.Items?.[0] }
    });
    console.log(`${hasResults ? '✅' : '⚠️'} Found ${locations.Items?.length || 0} locations`);
  } catch (error: any) {
    results.push({
      endpoint: '/locations',
      method: 'POST',
      status: 'failure',
      message: error.message
    });
    console.log('❌ Error:', error.message);
  }

  // Test 9: Get Asset Counts
  console.log('\n9️⃣ Testing Asset Counts (GET /assets/counts)...');
  try {
    const counts = await client.getAssetCounts();
    const hasResults = counts && Object.keys(counts).length > 0;
    results.push({
      endpoint: '/assets/counts',
      method: 'GET',
      status: hasResults ? 'success' : 'empty',
      message: `Found ${Object.keys(counts).length} asset types`,
      data: counts
    });
    console.log(`${hasResults ? '✅' : '⚠️'} Found ${Object.keys(counts).length} asset types`);
  } catch (error: any) {
    results.push({
      endpoint: '/assets/counts',
      method: 'GET',
      status: 'failure',
      message: error.message
    });
    console.log('❌ Error:', error.message);
  }

  // Print Summary
  console.log('\n' + '=' .repeat(50));
  console.log('📊 VALIDATION SUMMARY');
  console.log('=' .repeat(50));
  
  const successful = results.filter(r => r.status === 'success').length;
  const failed = results.filter(r => r.status === 'failure').length;
  const empty = results.filter(r => r.status === 'empty').length;
  
  console.log(`✅ Successful: ${successful}`);
  console.log(`⚠️  Empty Results: ${empty}`);
  console.log(`❌ Failed: ${failed}`);
  console.log('\nDetailed Results:');
  console.log('-' .repeat(50));
  
  results.forEach((result, index) => {
    const icon = result.status === 'success' ? '✅' : 
                 result.status === 'empty' ? '⚠️' : '❌';
    console.log(`${index + 1}. ${icon} ${result.method} ${result.endpoint}`);
    console.log(`   Status: ${result.status}`);
    console.log(`   Message: ${result.message}`);
    if (result.data && result.status === 'success') {
      console.log(`   Data: ${JSON.stringify(result.data, null, 2).substring(0, 200)}...`);
    }
  });

  // Save results to file
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(process.cwd(), 'context', `api-validation-${timestamp}.json`);
  const fs = await import('fs');
  
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    endpoint: process.env.IIQ_API_BASE_URL,
    results: results
  }, null, 2));
  
  console.log(`\n📄 Full report saved to: ${reportPath}`);
}

// Run validation
validateAPI().catch(error => {
  console.error('Fatal error during validation:', error);
  process.exit(1);
});