import { Injectable, inject } from '@angular/core';
import {
  Box,
  CONNECTED_SLOTS,
  ExportTemplate,
  FractionFormat,
  LUANTI_FACE_DIRECTIONS,
  NodeboxProject,
  NodeboxSlot,
  WALLMOUNTED_SLOTS
} from '../models/nodebox.model';
import { formatCoordinate } from '../utils/fraction.utils';
import { TextureService } from './texture.service';


@Injectable({
  providedIn: 'root'
})
export class LuaGeneratorService {
  private textureService?: TextureService;

  constructor(textureService?: TextureService) {
    if (textureService) {
      this.textureService = textureService;
    } else {
      try {
        this.textureService = inject(TextureService);
      } catch {
        this.textureService = undefined;
      }
    }
  }

  /**
   * Formats a collection of boxes into neat column-aligned Lua tuples.
   */
  private formatBoxLines(boxes: Box[], project: NodeboxProject, indent: string): string {
    if (boxes.length === 0) return '';
    const formattedRows = boxes.map(b => ({
      box: b,
      coords: [
        formatCoordinate(b.minX, project.format, project.snapResolution),
        formatCoordinate(b.minY, project.format, project.snapResolution),
        formatCoordinate(b.minZ, project.format, project.snapResolution),
        formatCoordinate(b.maxX, project.format, project.snapResolution),
        formatCoordinate(b.maxY, project.format, project.snapResolution),
        formatCoordinate(b.maxZ, project.format, project.snapResolution)
      ]
    }));

    const colWidths = [0, 0, 0, 0, 0, 0];
    for (const row of formattedRows) {
      for (let i = 0; i < 6; i++) {
        if (row.coords[i].length > colWidths[i]) {
          colWidths[i] = row.coords[i].length;
        }
      }
    }

    return formattedRows.map(row => {
      const paddedCoords = row.coords.map((c, i) => c.padStart(colWidths[i]));
      return `${indent}{${paddedCoords.join(', ')}}, -- ${row.box.name}`;
    }).join('\n');
  }

  /**
   * Generates formatted Lua code representing the nodebox project.
   */
  public generate(project: NodeboxProject): string {
    const nodeboxType = project.nodeboxType || 'fixed';
    const visibleBoxes = project.boxes.filter(b => b.visible);

    if (nodeboxType === 'regular') {
      return this.generateRegular(project);
    }

    if (visibleBoxes.length === 0) {
      return '-- No visible boxes to export\nfixed = {}\n';
    }

    if (nodeboxType === 'connected') {
      return this.generateConnected(project, visibleBoxes);
    }

    if (nodeboxType === 'wallmounted') {
      return this.generateWallmounted(project, visibleBoxes);
    }

    // Default: 'fixed' or 'leveled'
    return this.generateFixedOrLeveled(project, visibleBoxes, nodeboxType === 'leveled');
  }

  private generateRegular(project: NodeboxProject): string {
    switch (project.exportTemplate) {
      case 'fixed_only':
        return `fixed = {\n    {-0.5, -0.5, -0.5, 0.5, 0.5, 0.5}\n}`;

      case 'node_box':
        return `node_box = {\n    type = "regular"\n}`;

      case 'register_node':
      default: {
        const nodeName = project.nodeName || 'mymod:custom_node';
        const tiles = this.generateTilesSnippet(project);
        return `core.register_node("${nodeName}", {
    description = "${project.name || 'Custom Node'}",
    tiles = {
${tiles}
    },
    drawtype = "nodebox",
    paramtype = "light",
    paramtype2 = "facedir",
    node_box = {
        type = "regular"
    }
})`;
      }
    }
  }

  private generateConnected(project: NodeboxProject, visibleBoxes: Box[]): string {
    const slotSections: string[] = [];
    const indent = project.exportTemplate === 'register_node' ? '        ' : '    ';

    for (const slot of CONNECTED_SLOTS) {
      const slotBoxes = visibleBoxes.filter(b => (b.slot || 'fixed') === slot);
      if (slotBoxes.length > 0) {
        const lines = this.formatBoxLines(slotBoxes, project, indent + '    ');
        slotSections.push(`${indent}${slot} = {\n${lines}\n${indent}}`);
      }
    }

    // Fallback if no slot boxes found
    if (slotSections.length === 0) {
      const lines = this.formatBoxLines(visibleBoxes, project, indent + '    ');
      slotSections.push(`${indent}fixed = {\n${lines}\n${indent}}`);
    }

    const nodeboxBody = `${indent}type = "connected",\n${slotSections.join(',\n')}`;

    switch (project.exportTemplate) {
      case 'fixed_only':
        return `node_box = {\n${nodeboxBody}\n}`;

      case 'node_box':
        return `node_box = {\n${nodeboxBody}\n}`;

      case 'register_node':
      default: {
        const nodeName = project.nodeName || 'mymod:custom_node';
        const tiles = this.generateTilesSnippet(project);
        const connectsToList = (project.connectsTo && project.connectsTo.length > 0)
          ? project.connectsTo
          : ['group:fence', 'group:wood', nodeName];
        const connectsToStr = connectsToList.map(c => `"${c}"`).join(', ');

        return `core.register_node("${nodeName}", {
    description = "${project.name || 'Custom Node'}",
    tiles = {
${tiles}
    },
    drawtype = "nodebox",
    paramtype = "light",
    paramtype2 = "facedir",
    connects_to = { ${connectsToStr} },
    node_box = {
${nodeboxBody}
    }
})`;
      }
    }
  }

  private generateWallmounted(project: NodeboxProject, visibleBoxes: Box[]): string {
    const slotSections: string[] = [];
    const indent = project.exportTemplate === 'register_node' ? '        ' : '    ';

    for (const slot of WALLMOUNTED_SLOTS) {
      const slotBoxes = visibleBoxes.filter(b => (b.slot || 'wall_bottom') === slot);
      if (slotBoxes.length > 0) {
        const lines = this.formatBoxLines(slotBoxes, project, indent + '    ');
        slotSections.push(`${indent}${slot} = {\n${lines}\n${indent}}`);
      }
    }

    if (slotSections.length === 0) {
      const lines = this.formatBoxLines(visibleBoxes, project, indent + '    ');
      slotSections.push(`${indent}wall_bottom = {\n${lines}\n${indent}}`);
    }

    const nodeboxBody = `${indent}type = "wallmounted",\n${slotSections.join(',\n')}`;

    switch (project.exportTemplate) {
      case 'fixed_only':
        return `node_box = {\n${nodeboxBody}\n}`;

      case 'node_box':
        return `node_box = {\n${nodeboxBody}\n}`;

      case 'register_node':
      default: {
        const nodeName = project.nodeName || 'mymod:custom_node';
        const tiles = this.generateTilesSnippet(project);

        return `core.register_node("${nodeName}", {
    description = "${project.name || 'Custom Node'}",
    tiles = {
${tiles}
    },
    drawtype = "nodebox",
    paramtype = "light",
    paramtype2 = "wallmounted",
    node_box = {
${nodeboxBody}
    }
})`;
      }
    }
  }

  private generateFixedOrLeveled(project: NodeboxProject, visibleBoxes: Box[], isLeveled: boolean): string {
    const typeStr = isLeveled ? 'leveled' : 'fixed';
    const paramtype2 = isLeveled ? 'leveled' : 'facedir';

    const boxLines = this.formatBoxLines(visibleBoxes, project, '    ');
    const fixedBody = boxLines;

    switch (project.exportTemplate) {
      case 'fixed_only':
        return `fixed = {\n${fixedBody}\n}`;

      case 'node_box':
        return `node_box = {\n    type = "${typeStr}",\n    fixed = {\n${this.formatBoxLines(visibleBoxes, project, '        ')}\n    }\n}`;

      case 'register_node':
      default: {
        const nodeName = project.nodeName || 'mymod:custom_node';
        const tiles = this.generateTilesSnippet(project);
        const registerBoxLines = this.formatBoxLines(visibleBoxes, project, '        ');

        return `core.register_node("${nodeName}", {
    description = "${project.name || 'Custom Node'}",
    tiles = {
${tiles}
    },
    drawtype = "nodebox",
    paramtype = "light",
    paramtype2 = "${paramtype2}",
    node_box = {
        type = "${typeStr}",
        fixed = {
${registerBoxLines}
        }
    }
})`;
      }
    }
  }

  private generateTilesSnippet(project: NodeboxProject): string {
    return LUANTI_FACE_DIRECTIONS.map(dir => {
      const texKey = project.globalTextures[dir] || 'default_wood.png';
      const texDef = this.textureService?.getTextureById(texKey);
      if (texDef && texDef.animation && texDef.animation.type === 'vertical_frames') {
        const anim = texDef.animation;
        const cullingProp = texDef.backfaceCulling !== undefined ? `\n            backface_culling = ${texDef.backfaceCulling},` : '';
        return `        {
            name = "${texKey}",
            animation = {
                type = "vertical_frames",
                aspect_w = ${anim.aspect_w},
                aspect_h = ${anim.aspect_h},
                length = ${anim.length},
            },${cullingProp}
        }, -- ${dir}`;
      }
      return `        "${texKey}", -- ${dir}`;
    }).join('\n');
  }
}

