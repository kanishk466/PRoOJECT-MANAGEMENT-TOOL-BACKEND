export const STATUS_RULES = {
  DEVELOPER: {
    ASSIGNED: ["IN_PROGRESS"],
    IN_PROGRESS: ["RESOLVED"],
  },

  TESTER: {
    RESOLVED: ["CLOSED", "REOPENED"],
    REOPENED: ["ASSIGNED"], // ✅ IMPORTANT
  },

  MANAGER: {
    OPEN: ["ASSIGNED"],
    ASSIGNED: ["IN_PROGRESS"],
    IN_PROGRESS: ["RESOLVED"],
    RESOLVED: ["CLOSED", "REOPENED"],
    REOPENED: ["ASSIGNED"], // ✅ override
    CLOSED: ["REOPENED"],
  },
};

export const canTransition = (role, fromStatus, toStatus) => {
  // console.log(role , fromStatus , toStatus);
  
  return STATUS_RULES[role]?.[fromStatus]?.includes(toStatus);
};



