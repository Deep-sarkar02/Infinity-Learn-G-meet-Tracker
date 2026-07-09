import { useCallback, useState } from "react";
import { adminService } from "../services/admin.service";
import { useToast } from "../hooks/useToast";
import { useAdminStore } from "../models/admin.store";

export const useAdminController = () => {
  const {
    teachers,
    setTeachers,
    addTeacher: addTeacherToStore,
    updateTeacherGrade: updateGradeInStore,
    mergeTeacher,
  } = useAdminStore();
  const [loading, setLoading] = useState(false);
  const { pushToast } = useToast();

  const addTeacher = async (payload) => {
    setLoading(true);
    try {
      const { data } = await adminService.createTeacher(payload);
      const d = data.data;
      if (d.assignmentAdded) {
        mergeTeacher(d.teacher.id, d.teacher);
        pushToast({
          title: "Assignment(s) added to existing teacher (same email — no new password email)",
        });
      } else {
        addTeacherToStore(d.teacher);
        if (d.emailSent) {
          pushToast({ title: "Teacher created and password emailed" });
        } else if (!d.smtpConfigured) {
          pushToast({
            title: "Teacher created (AWS SES not configured in backend .env — email not sent)",
          });
        } else {
          pushToast({
            title: "Teacher created but email failed — check backend logs and SES template / sandbox",
            variant: "error",
          });
        }
      }
      return data.data;
    } catch (error) {
      pushToast({
        title: error.response?.data?.message || "Unable to create teacher",
        variant: "error",
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const loadTeachers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await adminService.listTeachers();
      setTeachers(data.data || []);
    } catch (error) {
      pushToast({
        title: error.response?.data?.message || "Unable to load teachers",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [pushToast, setTeachers]);

  const updateTeacherGrade = async (teacherId, grade) => {
    setLoading(true);
    try {
      const { data } = await adminService.assignGrade(teacherId, grade);
      updateGradeInStore(teacherId, data.data.grade);
      pushToast({ title: "Grade updated" });
    } catch (error) {
      pushToast({
        title: error.response?.data?.message || "Failed to update grade",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateTeacher = useCallback(
    async (teacherId, payload) => {
      setLoading(true);
      try {
        const { data } = await adminService.updateTeacher(teacherId, payload);
        mergeTeacher(teacherId, data.data);
        pushToast({ title: "Teacher updated" });
        return data.data;
      } catch (error) {
        pushToast({
          title: error.response?.data?.message || "Failed to update teacher",
          variant: "error",
        });
        return null;
      } finally {
        setLoading(false);
      }
    },
    [mergeTeacher, pushToast],
  );

  const regenerateTeacherPassword = async (teacherId, sendEmail = true) => {
    setLoading(true);
    try {
      const { data } = await adminService.regenerateTeacherPassword(teacherId, sendEmail);
      const d = data.data;
      if (d.emailSent) {
        pushToast({ title: "Password regenerated and emailed" });
      } else if (!d.smtpConfigured) {
        pushToast({
          title: "Password regenerated (AWS SES not configured in backend .env — email not sent)",
        });
      } else {
        pushToast({
          title: "Password regenerated but email failed — check backend logs and SES template / sandbox",
          variant: "error",
        });
      }
      return data.data;
    } catch (error) {
      pushToast({
        title: error.response?.data?.message || "Failed to regenerate password",
        variant: "error",
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const viewTeacherPassword = async (teacherId, adminPassword) => {
    try {
      const { data } = await adminService.viewTeacherPassword(teacherId, adminPassword);
      return data.data;
    } catch (error) {
      pushToast({
        title: error.response?.data?.message || "Failed to view password",
        variant: "error",
      });
      return null;
    }
  };

  const setBookingWindow = async (days) => {
    setLoading(true);
    try {
      const { data } = await adminService.configureBookingWindow(days);
      pushToast({ title: "Booking window updated" });
      return data?.data ?? null;
    } catch (error) {
      pushToast({
        title: error.response?.data?.message || "Failed to configure window",
        variant: "error",
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const loadBookingWindow = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await adminService.getBookingWindow();
      return Number(data?.data?.bookingWindowDays) || 7;
    } catch (error) {
      pushToast({
        title: error.response?.data?.message || "Failed to load booking window",
        variant: "error",
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  return {
    teachers,
    loading,
    addTeacher,
    loadTeachers,
    updateTeacherGrade,
    updateTeacher,
    regenerateTeacherPassword,
    viewTeacherPassword,
    setBookingWindow,
    loadBookingWindow,
  };
};
