import React from 'react';
import {
  Crosshair,
  TrendingUp,
  ArrowUpRight,
  Minus,
  MoveHorizontal,
  Percent,
  Columns,
  Pencil,
  Type,
  Trash2,
} from 'lucide-react';
import { DRAWING_TOOLS } from '../chart/drawingTools';

const ICON_MAP = {
  Crosshair,
  TrendingUp,
  ArrowUpRight,
  Minus,
  MoveHorizontal,
  Percent,
  Columns,
  Pencil,
  Type,
};

export function Sidebar({ activeTool, onSelectTool, onClearDrawings }) {
  return (
    <aside className="flex w-12 flex-col items-center justify-between border-r border-[#2a2e39] bg-[#131722] py-2 select-none z-10">
      {/* Tool Icons */}
      <div className="flex flex-col items-center gap-1 w-full px-1">
        {DRAWING_TOOLS.map((tool) => {
          const IconComponent = ICON_MAP[tool.icon] || Crosshair;
          const isActive = activeTool === tool.id;

          return (
            <button
              key={tool.id}
              onClick={() => onSelectTool(tool.id)}
              title={`${tool.name} tool`}
              className={`relative flex h-8 w-8 items-center justify-center rounded transition-all duration-150 group ${
                isActive
                  ? 'bg-[#2962ff]/20 text-[#2962ff] shadow-sm'
                  : 'text-[#787b86] hover:bg-[#2a2e39] hover:text-[#d1d4dc]'
              }`}
            >
              {isActive && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-[#2962ff]" />
              )}
              <IconComponent className="h-4 w-4" />

              {/* Tooltip on hover */}
              <div className="absolute left-10 z-50 hidden rounded bg-[#1e222d] px-2 py-1 text-[11px] font-medium text-white shadow-xl border border-[#2a2e39] whitespace-nowrap group-hover:block pointer-events-none">
                {tool.name}
              </div>
            </button>
          );
        })}
      </div>

      {/* Bottom Section: Clear Drawings */}
      <div className="w-full px-1 pt-2 border-t border-[#2a2e39] flex flex-col items-center">
        <button
          onClick={onClearDrawings}
          title="Clear all drawings"
          className="flex h-8 w-8 items-center justify-center rounded text-[#787b86] hover:bg-[#2a2e39] hover:text-[#f23645] transition-colors group relative"
        >
          <Trash2 className="h-4 w-4" />
          <div className="absolute left-10 z-50 hidden rounded bg-[#1e222d] px-2 py-1 text-[11px] font-medium text-[#f23645] shadow-xl border border-[#2a2e39] whitespace-nowrap group-hover:block pointer-events-none">
            Remove all drawings
          </div>
        </button>
      </div>
    </aside>
  );
}
