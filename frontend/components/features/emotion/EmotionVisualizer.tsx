
// components/features/emotion/EmotionVisualizer.tsx

import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { EmotionVisualizerProps } from '../../../utils/types';

const EmotionVisualizer: React.FC<EmotionVisualizerProps> = ({
  data,
  width = 600,
  height = 400,
  interactive = true,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!data || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 20, right: 20, bottom: 40, left: 40 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

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

    // Add axes
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale))
      .append('text')
      .attr('x', innerWidth / 2)
      .attr('y', 35)
      .attr('text-anchor', 'middle')
      .style('fill', '#374151')
      .text('Valence (Pleasantness)');

    g.append('g')
      .call(d3.axisLeft(yScale))
      .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -30)
      .attr('x', -innerHeight / 2)
      .attr('text-anchor', 'middle')
      .style('fill', '#374151')
      .text('Arousal (Energy)');

    // Add emotion points
    const points = g.selectAll('.emotion-point')
      .data(data.emotion_space.coordinates)
      .enter()
      .append('circle')
      .attr('class', 'emotion-point')
      .attr('cx', d => xScale(d.valence))
      .attr('cy', d => yScale(d.arousal))
      .attr('r', 6)
      .attr('fill', (d, i) => colorScale(data.emotion_space.labels[i]) as string)
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2)
      .style('cursor', interactive ? 'pointer' : 'default');

    // Add labels
    g.selectAll('.emotion-label')
      .data(data.emotion_space.coordinates)
      .enter()
      .append('text')
      .attr('class', 'emotion-label')
      .attr('x', d => xScale(d.valence))
      .attr('y', d => yScale(d.arousal) - 10)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('font-weight', '500')
      .style('fill', '#374151')
      .text((d, i) => data.emotion_space.labels[i]);

    // Add interactivity
    if (interactive) {
      points
        .on('mouseover', function(event, d) {
          d3.select(this)
            .transition()
            .duration(200)
            .attr('r', 8)
            .attr('stroke-width', 3);
        })
        .on('mouseout', function(event, d) {
          d3.select(this)
            .transition()
            .duration(200)
            .attr('r', 6)
            .attr('stroke-width', 2);
        });
    }

    // Add background grid
    g.selectAll('.grid-line-x')
      .data(xScale.ticks(5))
      .enter()
      .append('line')
      .attr('class', 'grid-line-x')
      .attr('x1', d => xScale(d))
      .attr('x2', d => xScale(d))
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .attr('stroke', '#e5e7eb')
      .attr('stroke-width', 1)
      .attr('opacity', 0.5);

    g.selectAll('.grid-line-y')
      .data(yScale.ticks(5))
      .enter()
      .append('line')
      .attr('class', 'grid-line-y')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', d => yScale(d))
      .attr('y2', d => yScale(d))
      .attr('stroke', '#e5e7eb')
      .attr('stroke-width', 1)
      .attr('opacity', 0.5);

  }, [data, width, height, interactive]);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h4 className="text-lg font-medium text-gray-900 mb-4">Emotion Analysis</h4>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="border border-gray-100 rounded"
      />
    </div>
  );
};

export default EmotionVisualizer;