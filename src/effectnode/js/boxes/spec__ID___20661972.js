/* "spec" */

export const box = (relay) => {
  let spec = {
    count: 750,
    numSides: 3,
    subdivisions: 20,
    openEnded: true,
    ballSize: 1.0,
    thickness: 0.5,
  };

  relay.pulse({ spec });
};
