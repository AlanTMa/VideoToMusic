// frontend/pages/api/health.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { API_CONFIG } from '../../config/api';

interface HealthData {
  status: string;
  timestamp: string;
  uptime: number;
  frontend: {
    status: string;
    version: string;
    environment: string;
  };
  backend?: {
    status: string;
    model_loaded: boolean;
    uptime: number;
    memory_usage?: {
      used: number;
      total: number;
    };
  };
}

interface ApiError {
  error: string;
  timestamp: string;
}

const startTime = Date.now();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HealthData | ApiError>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
      timestamp: new Date().toISOString()
    });
  }

  try {
    // Frontend health
    const frontendHealth = {
      status: 'healthy',
      version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    };

    let backendHealth;

    // Check backend health
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const backendResponse = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.HEALTH}`, {
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      clearTimeout(timeoutId);

      if (backendResponse.ok) {
        backendHealth = await backendResponse.json();
      } else {
        backendHealth = {
          status: 'unhealthy',
          model_loaded: false,
          uptime: 0,
          error: `Backend returned ${backendResponse.status}`
        };
      }
    } catch (error) {
      // Backend is unreachable or timed out
      backendHealth = {
        status: 'unreachable',
        model_loaded: false,
        uptime: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    const healthData: HealthData = {
      status: backendHealth.status === 'healthy' ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: Date.now() - startTime,
      frontend: frontendHealth,
      backend: backendHealth
    };

    // Return appropriate status code
    const statusCode = healthData.status === 'healthy' ? 200 : 503;

    res.status(statusCode).json(healthData);

  } catch (error) {
    console.error('Health check error:', error);

    res.status(500).json({
      error: 'Internal server error during health check',
      timestamp: new Date().toISOString()
    });
  }
}