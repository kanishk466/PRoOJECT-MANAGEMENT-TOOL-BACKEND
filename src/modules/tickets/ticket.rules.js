export const STATUS_RULES = {
  DEVELOPER: {
    ASSIGNED: ["IN_PROGRESS"],
    IN_PROGRESS: ["RESOLVED", "BLOCKED"],
    BLOCKED: ["IN_PROGRESS"],
  },
  TESTER: {
    RESOLVED: ["CLOSED", "REOPENED"],
  },
  MANAGER: {
    OPEN: ["ASSIGNED"],
    ASSIGNED: ["IN_PROGRESS"],  
    CLOSED: ["REOPENED"],
  },
};

export const canTransition = (role, fromStatus, toStatus) => {
  return STATUS_RULES[role]?.[fromStatus]?.includes(toStatus);
};



