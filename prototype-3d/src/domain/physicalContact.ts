type Manifold = {
  numSolverContacts: () => number;
  solverContactDist: (index: number) => number;
  numContacts: () => number;
  contactImpulse: (index: number) => number;
};
export function hasPhysicalContact(manifold: Manifold): boolean {
  // Rapier can apply a collision impulse while CCD/speculative separation is
  // still positive. Distance alone misses real thin-rim rebounds.
  for (let i = 0; i < manifold.numContacts(); i++)
    if (manifold.contactImpulse(i) > 0) return true;
  for (let i = 0; i < manifold.numSolverContacts(); i++)
    if (manifold.solverContactDist(i) <= 0.001) return true;
  return false;
}
