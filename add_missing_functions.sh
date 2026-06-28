#!/bin/bash

FILE="src/features/dresses/dress.service.ts"

# Add updateDressStatus function
cat >> "$FILE" << 'FUNC'

export function updateDressStatus(code: string, status: Dress['status']): Dress | null {
  return updateDress(code, { status });
}
FUNC

# Add filterDresses function
cat >> "$FILE" << 'FUNC'

export function filterDresses(filters: { search: string; status: string; category: string }): Dress[] {
  let dresses = getDresses();
  
  if (filters.search) {
    dresses = dresses.filter(d => 
      d.name.includes(filters.search) || 
      d.code.includes(filters.search)
    );
  }
  
  if (filters.status !== 'all') {
    dresses = dresses.filter(d => d.status === filters.status);
  }
  
  if (filters.category !== 'all') {
    dresses = dresses.filter(d => d.category === filters.category);
  }
  
  return dresses;
}
FUNC

# Add summarizeDresses function
cat >> "$FILE" << 'FUNC'

export function summarizeDresses(): { total: number; available: number; rented: number; inService: number } {
  const dresses = getDresses();
  
  return {
    total: dresses.length,
    available: dresses.filter(d => d.status === 'available').length,
    rented: dresses.filter(d => d.status === 'rented').length,
    inService: dresses.filter(d => d.status === 'laundry' || d.status === 'maintenance').length,
  };
}
FUNC

echo "Missing functions added to dress.service.ts"
