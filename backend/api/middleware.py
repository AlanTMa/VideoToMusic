
# backend/app/api/middleware.py

from fastapi import Request, Response
from fastapi.middleware.base import BaseHTTPMiddleware
import time
import logging
import uuid
from typing import Callable

logger = logging.getLogger(__name__)


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware for logging HTTP requests and responses."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Generate request ID
        request_id = str(uuid.uuid4())[:8]

        # Start timing
        start_time = time.time()

        # Log request
        logger.info(
            f"[{request_id}] {request.method} {request.url.path} "
            f"from {request.client.host if request.client else 'unknown'}"
        )

        # Add request ID to headers
        request.state.request_id = request_id

        # Process request
        response = await call_next(request)

        # Calculate processing time
        process_time = time.time() - start_time

        # Log response
        logger.info(
            f"[{request_id}] {response.status_code} "
            f"processed in {process_time:.3f}s"
        )

        # Add headers
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Process-Time"] = str(process_time)

        return response


class ErrorHandlingMiddleware(BaseHTTPMiddleware):
    """Middleware for global error handling."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        try:
            response = await call_next(request)
            return response

        except Exception as e:
            request_id = getattr(request.state, 'request_id', 'unknown')

            logger.error(
                f"[{request_id}] Unhandled exception: {str(e)}",
                exc_info=True
            )

            # Return generic error response
            from fastapi.responses import JSONResponse
            return JSONResponse(
                status_code=500,
                content={
                    "error": "Internal server error",
                    "request_id": request_id,
                    "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ")
                }
            )


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Simple rate limiting middleware."""

    def __init__(self, app, calls_limit: int = 100, window_seconds: int = 3600):
        super().__init__(app)
        self.calls_limit = calls_limit
        self.window_seconds = window_seconds
        self.clients = {}  # In production, use Redis

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        client_ip = request.client.host if request.client else "unknown"
        current_time = time.time()

        # Clean old entries
        self.clients = {
            ip: calls for ip, calls in self.clients.items()
            if any(call_time > current_time - self.window_seconds for call_time in calls)
        }

        # Check rate limit
        if client_ip in self.clients:
            # Filter recent calls
            recent_calls = [
                call_time for call_time in self.clients[client_ip]
                if call_time > current_time - self.window_seconds
            ]

            if len(recent_calls) >= self.calls_limit:
                from fastapi.responses import JSONResponse
                return JSONResponse(
                    status_code=429,
                    content={
                        "error": "Rate limit exceeded",
                        "limit": self.calls_limit,
                        "window_seconds": self.window_seconds
                    }
                )

            # Add current call
            self.clients[client_ip] = recent_calls + [current_time]
        else:
            self.clients[client_ip] = [current_time]

        response = await call_next(request)
        return response