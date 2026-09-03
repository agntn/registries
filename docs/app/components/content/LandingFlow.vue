<script setup lang="ts">
import type { LookupSample } from "../../utils/landing-fixtures";
import { bareUrl, displayName, shortValue } from "../../utils/format";
import { ECOSYSTEMS } from "../../utils/registries";

const props = defineProps<{ sample: LookupSample; tick: number }>();

const W = 1200;
const H = 420;
const PURL = { x: 24, y: 150, w: 340, h: 120 };
const NODE = { x: 500, w: 240, h: 44, gap: 22 };
const PACKAGE = { x: 900, y: 16, w: 276, h: 388 };
const ROW_H = 46;

const registries = computed(() =>
  ECOSYSTEMS.map((ecosystem, index) => ({
    ...ecosystem,
    y: 23 + index * (NODE.h + NODE.gap),
    active: ecosystem.key === props.sample.ecosystem,
  })),
);

function curvePath(x1: number, y1: number, x2: number, y2: number) {
  const mid = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`;
}

const trunkPaths = computed(() =>
  registries.value.map((registry) => ({
    d: curvePath(PURL.x + PURL.w, PURL.y + PURL.h / 2, NODE.x, registry.y + NODE.h / 2),
    active: registry.active,
  })),
);

const branchPaths = computed(() =>
  registries.value.map((registry) => ({
    d: curvePath(NODE.x + NODE.w, registry.y + NODE.h / 2, PACKAGE.x, PACKAGE.y + PACKAGE.h / 2),
    active: registry.active,
  })),
);

const fields = computed(() => {
  const pkg = props.sample.package;
  return [
    { label: "name", value: displayName(pkg) },
    { label: "latestVersion", value: pkg.latestVersion },
    { label: "licenses", value: pkg.licenses || "none" },
    { label: "repository", value: pkg.repository ? shortValue(bareUrl(pkg.repository), 30) : "none" },
    { label: "versions", value: String(props.sample.versionsTotal) },
    { label: "maintainers", value: String(props.sample.maintainersTotal) },
  ];
});

/** Space Mono is about 0.62 em wide per glyph; shrink the PURL until it fits the box. */
const purlFontSize = computed(() => Math.min(20, Math.floor((PURL.w - 36) / (props.sample.purl.length * 0.62))));
</script>

<template>
  <svg
    :viewBox="`0 0 ${W} ${H}`"
    class="registries-flow"
    role="img"
    aria-label="One PURL is routed to the matching registry adapter and comes back as one normalized package"
  >
    <g class="registries-flow-wires">
      <path v-for="(path, index) in trunkPaths" :key="`t${index}`" :d="path.d" :class="{ 'registries-flow-wire-dim': !path.active }" />
      <path v-for="(path, index) in branchPaths" :key="`b${index}`" :d="path.d" :class="{ 'registries-flow-wire-dim': !path.active }" />
    </g>
    <g :key="tick" class="registries-flow-pulses">
      <template v-for="(path, index) in trunkPaths" :key="`pt${index}`">
        <path v-if="path.active" :d="path.d" class="registries-flow-pulse" />
      </template>
      <template v-for="(path, index) in branchPaths" :key="`pb${index}`">
        <path v-if="path.active" :d="path.d" class="registries-flow-pulse registries-flow-pulse-late" />
      </template>
    </g>

    <g class="registries-flow-node">
      <rect :x="PURL.x" :y="PURL.y" :width="PURL.w" :height="PURL.h" rx="10" />
      <text :x="PURL.x + 18" :y="PURL.y + 30" class="registries-flow-label">purl</text>
      <text :x="PURL.x + 18" :y="PURL.y + 66" class="registries-flow-domain registries-flow-accent" :style="{ fontSize: `${purlFontSize}px` }">
        <tspan :key="sample.purl" class="registries-derive">{{ sample.purl }}</tspan>
      </text>
      <text :x="PURL.x + 18" :y="PURL.y + 96" class="registries-flow-mono">fetchPackageFromPURL</text>
    </g>

    <g v-for="registry in registries" :key="registry.key" class="registries-flow-node" :class="{ 'registries-flow-dim': !registry.active }">
      <rect :x="NODE.x" :y="registry.y" :width="NODE.w" :height="NODE.h" rx="8" />
      <text :x="NODE.x + 14" :y="registry.y + 18" class="registries-flow-title">{{ registry.label }}</text>
      <text :x="NODE.x + 14" :y="registry.y + 34" class="registries-flow-label">{{ registry.className }}</text>
    </g>

    <g class="registries-flow-node">
      <rect :x="PACKAGE.x" :y="PACKAGE.y" :width="PACKAGE.w" :height="PACKAGE.h" rx="10" />
      <text :x="PACKAGE.x + 18" :y="PACKAGE.y + 28" class="registries-flow-label">Package · normalized</text>
      <text :x="PACKAGE.x + PACKAGE.w - 18" :y="PACKAGE.y + 28" text-anchor="end" class="registries-flow-mono">
        {{ sample.live ? "live" : "sample" }}
      </text>
      <line
        :x1="PACKAGE.x + 1"
        :x2="PACKAGE.x + PACKAGE.w - 1"
        :y1="PACKAGE.y + 44"
        :y2="PACKAGE.y + 44"
        class="registries-flow-rule"
      />
      <g v-for="(field, index) in fields" :key="`${sample.purl}-${field.label}`" class="registries-derive">
        <text :x="PACKAGE.x + 18" :y="PACKAGE.y + 72 + index * ROW_H" class="registries-flow-label">{{ field.label }}</text>
        <text :x="PACKAGE.x + 18" :y="PACKAGE.y + 92 + index * ROW_H" class="registries-flow-title">{{ field.value }}</text>
      </g>
    </g>
  </svg>
</template>
