export const canUpdate = (status) => {
  return status === "SCHEDULED";
};

export const canReschedule = (status) => {
  return ["SCHEDULED", "RESCHEDULED"].includes(status);
};

export const canCancel = (status) => {
  return ["SCHEDULED", "RESCHEDULED", "CHECKED_IN"].includes(status);
};

export const canPatientJoin = (status) => {
  return ["SCHEDULED", "RESCHEDULED"].includes(status);
};

export const canAdmit = (status) => {
  return ["CHECKED_IN"].includes(status);
};

export const canStartConsultation = (status) => {
  return status === "ADMITTED";
};

export const canComplete = (status) => {
  return status === "IN_CONSULTATION";
};
