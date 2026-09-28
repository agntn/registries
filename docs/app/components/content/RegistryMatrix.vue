<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";
import { ECOSYSTEMS, type EcosystemInfo } from "../../utils/registries";
import { ROSTER_CLASS, ROSTER_TABLE_UI } from "../../utils/roster";

/** Empty until a header is clicked: the rows then keep the manifest order of `builtins`. */
const sorting = ref<{ id: string; desc: boolean }[]>([]);

const roster = useTemplateRef<HTMLElement>("roster");
useRosterFlip(
  () => roster.value,
  () => sorting.value,
);

const columns: TableColumn<EcosystemInfo>[] = [
  {
    accessorKey: "label",
    header: "Registry",
    sortingFn: "text",
    meta: { class: { th: "w-[10.5rem]" } },
  },
  /* Narrow, the row reads name and marks first, then the PURL, then the sentence. */
  {
    accessorKey: "purl",
    header: "PURL",
    enableSorting: false,
    meta: { class: { th: "w-[13rem]", td: "@max-[52rem]/roster:order-2" } },
  },
  {
    accessorKey: "about",
    header: "How it reads",
    enableSorting: false,
    meta: { class: { td: "@max-[52rem]/roster:order-3" } },
  },
  {
    accessorKey: "statuses",
    header: "Marks",
    sortingFn: "text",
    meta: {
      class: {
        th: "w-[9rem]",
        td: "@max-[52rem]/roster:order-1 @max-[52rem]/roster:col-span-1! @max-[52rem]/roster:justify-self-end",
      },
    },
  },
];

const order = computed(() => {
  const [first] = sorting.value;
  if (first === undefined) return "manifest order";
  const label = columns.find(
    (column) => "accessorKey" in column && column.accessorKey === first.id,
  )?.header;
  return `by ${String(label).toLowerCase()} ${first.desc ? "descending" : "ascending"}`;
});

/** A registry that never marks a version reads `nothing`, not a blank cell. */
function marks(row: EcosystemInfo): string {
  return row.statuses === "none" ? "nothing" : row.statuses.replace(" when flagged out of date", "");
}
</script>

<template>
  <section ref="roster" class="roster not-prose my-6" aria-label="Registries">
    <span class="console-cross console-cross-tl" aria-hidden="true">+</span>
    <span class="console-cross console-cross-br" aria-hidden="true">+</span>
    <header :class="ROSTER_CLASS.bar">
      <span :class="ROSTER_CLASS.title">ecosystems()</span>
      <span :class="ROSTER_CLASS.meta">{{ ECOSYSTEMS.length }} registries · {{ order }}</span>
    </header>
    <div class="roster-ruler" aria-hidden="true" />
    <UTable
      v-model:sorting="sorting"
      :data="[...ECOSYSTEMS]"
      :columns="columns"
      :get-row-id="(row) => row.key"
      :ui="ROSTER_TABLE_UI"
    >
      <template #label-header="{ column }"><RosterSort :column="column" label="Registry" /></template>
      <template #statuses-header="{ column }"><RosterSort :column="column" label="Marks" /></template>
      <template #label-cell="{ row }">
        <NuxtLink :to="row.original.to" :class="[ROSTER_CLASS.name, 'items-baseline']">
          <UIcon
            :name="row.original.icon"
            class="relative top-0.5 size-3.5 flex-none"
            aria-hidden="true"
          />
          <span>{{ row.original.label }}</span>
        </NuxtLink>
      </template>
      <template #purl-cell="{ row }">
        <span class="text-muted [overflow-wrap:anywhere]">{{ row.original.purl }}</span>
      </template>
      <template #about-cell="{ row }">
        <span :class="ROSTER_CLASS.about">{{ row.original.about }}</span>
      </template>
      <template #statuses-cell="{ row }">
        <span :class="ROSTER_CLASS.count"
          ><span :class="ROSTER_CLASS.leader" aria-hidden="true" /><UTooltip
            :text="`Versions ${row.original.label} marks: ${row.original.statuses}`"
            ><span
              tabindex="0"
              class="whitespace-nowrap"
              :class="row.original.statuses === 'none' ? 'text-dimmed' : 'text-(--console-accent)'"
              >{{ marks(row.original) }}</span
            ></UTooltip
          ></span
        >
      </template>
    </UTable>
    <footer :class="ROSTER_CLASS.footer">
      <span>read from builtins / no network</span>
      <span :class="ROSTER_CLASS.meta">create("&lt;key&gt;") loads one</span>
    </footer>
  </section>
</template>
