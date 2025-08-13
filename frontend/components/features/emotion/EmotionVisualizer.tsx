// components/features/emotion/EmotionVisualizer.tsx

import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { BarChart3, TrendingUp } from 'lucide-react';
import { EmotionVisualizerProps } from '../../../utils/types';

const EmotionVisualizer: React.FC<EmotionVisualizerProps> = ({
  data,
  width = 600,
  height = 400,
  interactive = true,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!data || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 30, right: 30, bottom: 50, left: 50 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Create main group
    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create gradient definitions
    const defs = svg.append('defs');

    // Background gradient
    const bgGradient = defs.append('linearGradient')
      .attr('id', 'bg-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '100%')
      .attr('y2', '100%');

    bgGradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#f3e8ff')
      .attr('stop-opacity', 0.3);

    bgGradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#e9d5ff')
      .attr('stop-opacity', 0.3);

    // Apply background
    g.append('rect')
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .attr('fill', 'url(#bg-gradient)')
      .attr('rx', 8);

    // Create scales
    const xScale = d3.scaleLinear()
      .domain([0, 1])
      .range([0, innerWidth]);

    const yScale = d3.scaleLinear()
      .domain([0, 1])
      .range([innerHeight, 0]);

    const colorScale = d3.scaleOrdinal()
      .domain(data.emotion_space.labels)
      .range(data.emotion_space.colors);

    // Add grid lines with subtle styling
    const gridLines = g.append('g').attr('class', 'grid');

    // Vertical grid lines
    gridLines.selectAll('.grid-line-x')
      .data(xScale.ticks(8))
      .enter()
      .append('line')
      .attr('class', 'grid-line-x')
      .attr('x1', d => xScale(d))
      .attr('x2', d => xScale(d))
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .attr('stroke', '#e5e7eb')
      .attr('stroke-width', 0.5)
      .attr('opacity', 0.7)
      .attr('stroke-dasharray', '2,2');

    // Horizontal grid lines
    gridLines.selectAll('.grid-line-y')
      .data(yScale.ticks(8))
      .enter()
      .append('line')
      .attr('class', 'grid-line-y')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', d => yScale(d))
      .attr('y2', d => yScale(d))
      .attr('stroke', '#e5e7eb')
      .attr('stroke-width', 0.5)
      .attr('opacity', 0.7)
      .attr('stroke-dasharray', '2,2');

    // Add axes with enhanced styling
    const xAxis = g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale)
        .tickSize(-innerHeight)
        .tickPadding(10))
      .style('font-size', '11px')
      .style('font-weight', '500');

    xAxis.select('.domain').attr('stroke', '#9ca3af');
    xAxis.selectAll('.tick line')
      .attr('stroke', '#e5e7eb')
      .attr('stroke-width', 0.5)
      .attr('opacity', 0);

    xAxis.append('text')
      .attr('x', innerWidth / 2)
      .attr('y', 40)
      .attr('text-anchor', 'middle')
      .style('fill', '#374151')
      .style('font-size', '12px')
      .style('font-weight', '600')
      .text('Valence (Pleasantness) →');

    const yAxis = g.append('g')
      .call(d3.axisLeft(yScale)
        .tickSize(-innerWidth)
        .tickPadding(10))
      .style('font-size', '11px')
      .style('font-weight', '500');

    yAxis.select('.domain').attr('stroke', '#9ca3af');
    yAxis.selectAll('.tick line')
      .attr('stroke', '#e5e7eb')
      .attr('stroke-width', 0.5)
      .attr('opacity', 0);

    yAxis.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -35)
      .attr('x', -innerHeight / 2)
      .attr('text-anchor', 'middle')
      .style('fill', '#374151')
      .style('font-size', '12px')
      .style('font-weight', '600')
      .text('Arousal (Energy) →');

    // Add emotion points with enhanced visuals
    const pointsGroup = g.append('g');

    // Add glow effect for points
    const glowFilter = defs.append('filter')
      .attr('id', 'glow');

    glowFilter.append('feGaussianBlur')
      .attr('stdDeviation', '3')
      .attr('result', 'coloredBlur');

    const feMerge = glowFilter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Create point groups for better interaction
    const points = pointsGroup.selectAll('.emotion-point-group')
      .data(data.emotion_space.coordinates)
      .enter()
      .append('g')
      .attr('class', 'emotion-point-group')
      .attr('transform', d => `translate(${xScale(d.valence)}, ${yScale(d.arousal)})`);

    // Add outer circle (glow effect)
    points.append('circle')
      .attr('r', 12)
      .attr('fill', (d, i) => colorScale(data.emotion_space.labels[i]) as string)
      .attr('opacity', 0.2);

    // Add main circle
    const mainCircles = points.append('circle')
      .attr('class', 'emotion-point')
      .attr('r', 8)
      .attr('fill', (d, i) => colorScale(data.emotion_space.labels[i]) as string)
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2.5)
      .style('cursor', interactive ? 'pointer' : 'default')
      .style('filter', 'url(#glow)');

    // Add labels with background
    const labels = points.append('g')
      .attr('class', 'emotion-label-group');

    // Label background
    labels.append('rect')
      .attr('x', -30)
      .attr('y', -28)
      .attr('width', 60)
      .attr('height', 18)
      .attr('rx', 9)
      .attr('fill', 'white')
      .attr('fill-opacity', 0.9)
      .attr('stroke', (d, i) => colorScale(data.emotion_space.labels[i]) as string)
      .attr('stroke-width', 1);

    // Label text
    labels.append('text')
      .attr('y', -15)
      .attr('text-anchor', 'middle')
      .style('font-size', '11px')
      .style('font-weight', '600')
      .style('fill', '#374151')
      .text((d, i) => data.emotion_space.labels[i]);

    // Add interactivity
    if (interactive) {
      points
        .on('mouseover', function(event, d) {
          // Scale up the point
          d3.select(this).select('.emotion-point')
            .transition()
            .duration(200)
            .attr('r', 10)
            .attr('stroke-width', 3);

          // Show tooltip
          const i = data.emotion_space.coordinates.indexOf(d);
          if (tooltipRef.current) {
            tooltipRef.current.style.display = 'block';
            tooltipRef.current.style.left = `${event.pageX + 10}px`;
            tooltipRef.current.style.top = `${event.pageY - 30}px`;
            tooltipRef.current.innerHTML = `
              <div class="bg-gray-900 text-white px-3 py-2 rounded-lg shadow-lg text-sm">
                <div class="font-semibold">${data.emotion_space.labels[i]}</div>
                <div class="text-xs opacity-90 mt-1">
                  Valence: ${d.valence.toFixed(2)} | Arousal: ${d.arousal.toFixed(2)}
                </div>
              </div>
            `;
          }
        })
        .on('mouseout', function(event, d) {
          // Scale down the point
          d3.select(this).select('.emotion-point')
            .transition()
            .duration(200)
            .attr('r', 8)
            .attr('stroke-width', 2.5);

          // Hide tooltip
          if (tooltipRef.current) {
            tooltipRef.current.style.display = 'none';
          }
        })
        .on('click', function(event, d) {
          const i = data.emotion_space.coordinates.indexOf(d);
          console.log('Clicked emotion:', data.emotion_space.labels[i], d);
        });
    }

    // Add legend
    const legend = svg.append('g')
      .attr('transform', `translate(${width - 100}, 20)`);

    legend.append('rect')
      .attr('x', -10)
      .attr('y', -5)
      .attr('width', 90)
      .attr('height', data.emotion_space.labels.length * 20 + 10)
      .attr('rx', 5)
      .attr('fill', 'white')
      .attr('fill-opacity', 0.9)
      .attr('stroke', '#e5e7eb');

    const legendItems = legend.selectAll('.legend-item')
      .data(data.emotion_space.labels)
      .enter()
      .append('g')
      .attr('class', 'legend-item')
      .attr('transform', (d, i) => `translate(0, ${i * 20})`);

    legendItems.append('circle')
      .attr('cx', 0)
      .attr('cy', 10)
      .attr('r', 5)
      .attr('fill', d => colorScale(d) as string);

    legendItems.append('text')
      .attr('x', 10)
      .attr('y', 10)
      .attr('dy', '0.35em')
      .style('font-size', '10px')
      .style('font-weight', '500')
      .style('fill', '#4b5563')
      .text(d => d);

  }, [data, width, height, interactive]);

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-500 to-purple-600 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-5 h-5 text-white" />
          <h4 className="text-white font-semibold">Emotion Analysis</h4>
        </div>
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-violet-200" />
          <span className="text-xs text-violet-100">Real-time</span>
        </div>
      </div>

      {/* Visualization */}
      <div className="p-5">
        <svg
          ref={svgRef}
          width={width}
          height={height}
          className="rounded-lg"
          style={{ maxWidth: '100%', height: 'auto' }}
        />
      </div>

      {/* Tooltip (hidden by default) */}
      <div
        ref={tooltipRef}
        className="fixed pointer-events-none z-50"
        style={{ display: 'none' }}
      />

      {/* Info Footer */}
      <div className="px-5 pb-5">
        <div className="bg-gradient-to-r from-violet-50 to-purple-50 rounded-lg p-3 border border-violet-200">
          <p className="text-xs text-violet-700 font-medium">
            💡 Interactive visualization based on emotional coordinates. Click points to explore.
          </p>
        </div>
      </div>
    </div>
  );
};

export default EmotionVisualizer;