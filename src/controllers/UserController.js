import UserService from "../services/UserService.js";
import { successResponse, errorResponse } from "../utils/response.js";

const service = new UserService();

export const getDoctorsByClinic = async (req, res) => {
    try {
        const clinicId = req.params.clinicId;
        const role= req.params.role||"DOCTOR"
        const searchQuery = req.query.search||"";

        if (!clinicId) {
            return errorResponse(res, "clinicId is required", 400);
        }

        const { result, error, code } = await service.getDoctorsByClinic(clinicId ,role, searchQuery);

        if (error) {
            return errorResponse(res, error, code);
        }

        return successResponse(
            res,
            { count: result.length,  result },
            "Data fetched successfully"
        );

    } catch (err) {
        return errorResponse(res, "Unexpected server error", 500, err.message);
    }
};
