import { Injectable } from '@angular/core';
import { Box, ExportTemplate, FractionFormat, LUANTI_FACE_DIRECTIONS, NodeboxProject } from '../models/nodebox.model';
import { formatCoordinate } from '../utils/fraction.utils';

@Injectable({
  providedIn: 'root'
})
export class LuaGeneratorService {
  /**
   * Generates formatted Lua code representing the nodebox project.
   */
  public generate(project: NodeboxProject): string {
    const visibleBoxes = project.boxes.filter(b => b.visible);
    if (visibleBoxes.length === 0) {
      return '-- No visible boxes to export\nfixed = {}\n';
    }

    // 1. Format coordinates for each box
    const formattedRows = visibleBoxes.map(b => {
      const coords = [
        formatCoordinate(b.minX, project.format, project.snapResolution),
        formatCoordinate(b.minY, project.format, project.snapResolution),
        formatCoordinate(b.minZ, project.format, project.snapResolution),
        formatCoordinate(b.maxX, project.format, project.snapResolution),
        formatCoordinate(b.maxY, project.format, project.snapResolution),
        formatCoordinate(b.maxZ, project.format, project.snapResolution)
      ];
      return {
        box: b,
        coords
      };
    });

    // 2. Compute column widths for neat alignment
    const colWidths = [0, 0, 0, 0, 0, 0];
    for (const row of formattedRows) {
      for (let i = 0; i < 6; i++) {
        if (row.coords[i].length > colWidths[i]) {
          colWidths[i] = row.coords[i].length;
        }
      }
    }

    // 3. Build aligned box lines
    const boxLines = formattedRows.map(row => {
      const paddedCoords = row.coords.map((c, i) => c.padStart(colWidths[i]));
      const coordStr = paddedCoords.join(', ');
      return `    {${coordStr}}, -- ${row.box.name}`;
    });

    const fixedBody = boxLines.join('\n');

    // 4. Return appropriate template
    switch (project.exportTemplate) {
      case 'fixed_only':
        return `fixed = {\n${fixedBody}\n}`;

      case 'node_box':
        return `node_box = {\n    type = "fixed",\n    fixed = {\n${boxLines.map(l => '    ' + l).join('\n')}\n    }\n}`;

      case 'register_node':
      default: {
        const nodeName = project.nodeName || 'mymod:custom_node';
        const tiles = LUANTI_FACE_DIRECTIONS.map(dir => {
          const tex = project.globalTextures[dir] || 'default_wood.png';
          return `        "${tex}", -- ${dir}`;
        }).join('\n');

        return `minetest.register_node("${nodeName}", {
    description = "${project.name || 'Custom Node'}",
    tiles = {
${tiles}
    },
    drawtype = "nodebox",
    paramtype = "light",
    node_box = {
        type = "fixed",
        fixed = {
${boxLines.map(l => '        ' + l).join('\n')}
        }
    }
})`;
      }
    }
  }
}
