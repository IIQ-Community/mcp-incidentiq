#!/usr/bin/env tsx
/**
 * Query production endpoints to understand actual response formats
 */

import axios from 'axios';
import path from 'path';
import fs from 'fs';

// Load environment from context/config/.env
const envPath = path.join(process.cwd(), 'context', 'config', '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envLines = envContent.split('\n');

for (const line of envLines) {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex > 0) {
      const key = trimmed.substring(0, eqIndex).trim();
      const value = trimmed.substring(eqIndex + 1).trim();
      process.env[key] = value;
    }
  }
}

const client = axios.create({
  baseURL: process.env.IIQ_API_BASE_URL,
  headers: {
    'Authorization': `Bearer ${process.env.IIQ_API_KEY}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

async function queryEndpoints() {
  console.log('🔍 Querying Production Endpoints for Response Formats');
  console.log('=' .repeat(60));

  const queries = [
    {
      name: 'Ticket Statuses',
      method: 'GET',
      url: '/tickets/statuses',
    },
    {
      name: 'Ticket Categories',
      method: 'GET',
      url: '/tickets/categories',
    },
    {
      name: 'Ticket Priorities',
      method: 'GET',
      url: '/tickets/priorities',
    },
    {
      name: 'Asset Counts',
      method: 'GET',
      url: '/assets/counts',
    },
    {
      name: 'User Agents',
      method: 'GET',
      url: '/users/agents',
    },
    {
      name: 'Locations All',
      method: 'GET',
      url: '/locations/all',
    },
    {
      name: 'Teams All',
      method: 'GET',
      url: '/teams/all',
    },
    {
      name: 'Issue Types',
      method: 'GET',
      url: '/issues/types',
    },
    {
      name: 'Custom Field Types',
      method: 'GET',
      url: '/custom-fields/types',
    },
    {
      name: 'Manufacturers Global',
      method: 'GET',
      url: '/assets/manufacturers/global',
    },
    {
      name: 'Location Rooms',
      method: 'GET',
      url: '/locations/rooms',
    },
    {
      name: 'Parts Suppliers',
      method: 'GET',
      url: '/parts/suppliers',
    },
  ];

  const results: any[] = [];

  for (const query of queries) {
    console.log(`\n📌 ${query.name} (${query.method} ${query.url})`);
    console.log('-' .repeat(40));
    
    try {
      const response = await client.request({
        method: query.method,
        url: query.url,
      });
      
      const data = response.data;
      const responseType = Array.isArray(data) ? 'array' : typeof data;
      let structure = '';
      
      if (Array.isArray(data)) {
        structure = `Array[${data.length}]`;
        if (data.length > 0) {
          const sample = data[0];
          const keys = Object.keys(sample).slice(0, 5);
          structure += ` with keys: ${keys.join(', ')}`;
        }
      } else if (typeof data === 'object' && data !== null) {
        const keys = Object.keys(data);
        structure = `Object with keys: ${keys.join(', ')}`;
        
        // Check for wrapped response pattern
        if (data.Success !== undefined || data.Data !== undefined) {
          structure += ' (WRAPPED RESPONSE)';
        }
        if (data.Items !== undefined) {
          structure += ` (PAGINATED - ${data.Items.length} items)`;
        }
      }
      
      console.log(`✅ Success - Type: ${responseType}`);
      console.log(`   Structure: ${structure}`);
      
      // Save sample for analysis
      results.push({
        endpoint: query.url,
        method: query.method,
        responseType,
        structure,
        sampleKeys: Array.isArray(data) && data.length > 0 
          ? Object.keys(data[0]) 
          : (typeof data === 'object' ? Object.keys(data) : []),
        isEmpty: Array.isArray(data) ? data.length === 0 : false,
        sample: data.length ? (Array.isArray(data) ? data[0] : data) : data
      });
      
    } catch (error: any) {
      console.log(`❌ Error ${error.response?.status}: ${error.response?.statusText || error.message}`);
      results.push({
        endpoint: query.url,
        method: query.method,
        error: error.response?.status || error.message,
      });
    }
  }

  // Save results
  const reportPath = path.join(process.cwd(), 'context', 'response-formats.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  
  console.log('\n' + '=' .repeat(60));
  console.log(`📄 Response formats saved to: ${reportPath}`);
  
  // Summary
  console.log('\n📊 Response Format Summary:');
  const arrays = results.filter(r => r.responseType === 'array');
  const objects = results.filter(r => r.responseType === 'object');
  const errors = results.filter(r => r.error);
  
  console.log(`  Direct Arrays: ${arrays.length}`);
  console.log(`  Objects: ${objects.length}`);
  console.log(`  Errors: ${errors.length}`);
  
  if (arrays.length > 0) {
    console.log('\n  Array Responses:');
    arrays.forEach(r => {
      console.log(`    - ${r.endpoint}: ${r.structure}`);
    });
  }
}

queryEndpoints().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});