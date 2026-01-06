import Appointment from "../models/Appointment.js";



export async function autoMarkMissed (appt){
    try {
        
       
        
        if(!appt) return appt;
        const now = new Date();
        console.log(appt.endTime ,"sdsd");
        console.log(now,"233");

        

        const  eligibleStatus = ["SCHEDULED","RESCHEDULED","CHECKED_IN"];

        if(eligibleStatus.includes(appt.status) && appt.endTime && now > appt.endTime){

            await Appointment.updateOne({
                appointmentId:appt.appointmentId
            },
        {
            $set:{
                status:"MISSED" , updatedAt:new Date()
            }
        })
        appt.status = "MISSED";
        }

        
        return appt;


    } catch (error) {
        console.error("autoMarkMissed error:", err.message);
    return appt;
    }
}



export async function autoMarkMissedInList(appointments) {
  const now = new Date();
  const eligibleStatuses = ["SCHEDULED", "RESCHEDULED", "CHECKED_IN"];

  const tasks = appointments.map(async (appt) => {
    if (eligibleStatuses.includes(appt.status) && appt.endTime && now > appt.endTime) {

      await Appointment.updateOne(
        { appointmentId: appt.appointmentId },
        { $set: { status: "MISSED", updatedAt: new Date() } }
      );

      appt.status = "MISSED";
    }

    return appt;
  });

  return Promise.all(tasks);
}




// --- SAFE, CONSISTENT MISSED STATUS CHECKER ---
export async function checkAndApplyMissedStatus(appt, session = null) {
  try {
    if (!appt) return appt;

    const now = new Date();
    const eligible = ["SCHEDULED", "RESCHEDULED", "CHECKED_IN"];

    // Not eligible for missed
    if (!eligible.includes(appt.status)) {
      return appt;
    }

    if (!appt.endTime) return appt;

    // If endTime has NOT passed → do nothing
    if (now <= appt.endTime) return appt;

    // Cannot mark MISSED if the call already started
    if (appt.callStartedAt) return appt;
    if (appt.twilioRoomStatus === "CREATED") return appt;
    if (appt.twilioRoomStatus === "IN_PROGRESS") return appt;

    // Already MISSED or final state?
    if (["MISSED", "COMPLETED", "CANCELLED"].includes(appt.status)) {
      return appt;
    }

    // Apply MISSED status atomically
    const updated = await Appointment.findOneAndUpdate(
      { appointmentId: appt.appointmentId },
      {
        $set: {
          status: "MISSED",
          updatedAt: new Date(),
        },
      },
      { new: true, session }
    ).lean();

    return updated || appt;
  } catch (err) {
    console.error("checkAndApplyMissedStatus error:", err.message);
    return appt;
  }
}








