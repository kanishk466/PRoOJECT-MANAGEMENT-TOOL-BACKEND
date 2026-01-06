import User from "../models/User.js"



export async function populateUsersForAppointments(appointments) {
  try {
    if (!appointments || appointments.length === 0) {
      return appointments;
    }

    // Step 1: Gather all unique userIds (doctors + patients)
    const userIds = new Set();

    for (const appt of appointments) {
      if (appt.patientUserId) userIds.add(appt.patientUserId);
      if (appt.doctorUserId) userIds.add(appt.doctorUserId);
    }

    const ids = Array.from(userIds);

    // Step 2: Fetch all users in a SINGLE QUERY
    const users = await User.find({ userId: { $in: ids } }).lean();

    // Step 3: Map users by userId
    const userMap = {};
    users.forEach((u) => {
      userMap[u.userId] = {
        userId: u.userId,
        firstName: u.firstName,
        middleName: u.middleName,
        lastName: u.lastName,
        email: u.username,
        phone: u.phone,
        role: u.role,
        clinicId: u.clinicId,
      };
    });

    // Step 4: Attach user data to each appointment
    for (const appt of appointments) {
      appt.patient = userMap[appt.patientUserId] || null;
      appt.doctor = userMap[appt.doctorUserId] || null;
    }

    return appointments;
  } catch (err) {
    console.error("populateUsersForAppointments error:", err.message);
    return appointments; // fallback
  }
}
