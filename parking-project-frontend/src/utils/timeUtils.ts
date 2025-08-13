import moment from 'moment';
import { Moment } from 'moment';

/**
 * Utility functions để xử lý thời gian một cách nhất quán
 */

/**
 * Chuyển đổi thời gian từ backend (UTC string hoặc local string) về local time
 */
export const parseBackendTime = (timeString: string): Moment => {
    // Nếu backend trả về ISO string có Z hoặc offset, moment.parseZone sẽ giữ đúng timezone gốc.
    // Sau đó .local() để convert sang giờ máy người dùng.
    return moment.parseZone(timeString).local();
};

/**
 * Chuyển đổi thời gian local thành format để gửi lên backend
 */
export const formatForBackend = (localTime: Moment): string => {
    // Backend expects LocalDateTime (no timezone). Send as local time without offset.
    // Example: 2025-08-13T10:00:00
    return localTime.format('YYYY-MM-DDTHH:mm:ss');
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
 * Tính khoảng cách thời gian bằng giờ (số thập phân)
 */
export const calculateDurationHours = (startTime: Moment, endTime: Moment): number => {
    return endTime.diff(startTime, 'hours', true);
};

/**
 * Kiểm tra trạng thái thời gian: upcoming / active / past
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
