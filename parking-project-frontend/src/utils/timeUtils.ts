import moment, { Moment } from 'moment';

/**
 * Utility functions để xử lý thời gian một cách nhất quán
 */

/**
 * Chuyển đổi thời gian từ backend (UTC string) về local time
 */
export const parseBackendTime = (timeString: string): Moment => {
    return moment(timeString).local();
};

/**
 * Chuyển đổi thời gian local thành format để gửi lên backend
 */
export const formatForBackend = (localTime: Moment): string => {
    return localTime.toISOString();
};

/**
 * Format thời gian để hiển thị cho người dùng
 */
export const formatDisplayTime = (time: Moment): string => {
    return time.format('DD/MM/YYYY HH:mm');
};

/**
 * Format ngày để hiển thị
 */
export const formatDisplayDate = (time: Moment): string => {
    return time.format('dddd, DD/MM/YYYY');
};

/**
 * Format giờ để hiển thị
 */
export const formatDisplayHour = (time: Moment): string => {
    return time.format('HH:mm');
};

/**
 * Tính khoảng cách thời gian bằng giờ
 */
export const calculateDurationHours = (startTime: Moment, endTime: Moment): number => {
    return endTime.diff(startTime, 'hours', true);
};

/**
 * Kiểm tra thời gian có phải upcoming/active/past
 */
export const getTimeStatus = (startTime: Moment, endTime: Moment) => {
    const now = moment();
    const isUpcoming = startTime.isAfter(now);
    const isActive = startTime.isBefore(now) && endTime.isAfter(now);
    const isPast = endTime.isBefore(now);
    
    return { isUpcoming, isActive, isPast };
};

/**
 * Format thời gian relative (ago/from now)
 */
export const formatRelativeTime = (time: Moment): string => {
    return time.fromNow();
};
