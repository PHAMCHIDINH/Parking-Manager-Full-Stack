import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Select,
  MenuItem,
  Paper,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Snackbar,
} from "@mui/material";
import API from "../api";
import { SelectChangeEvent } from "@mui/material/Select";

type UserLite = {
  id: number;
  email?: string;
  name?: string;
};

type SpotLite = {
  id: number;
  label?: string;
};

export type AdminReservation = {
  id: number;
  user: UserLite;
  parkingSpot: SpotLite;
  startTime: string; // ISO
  endTime: string;   // ISO
};

type StatusFilter = "ALL" | "UPCOMING" | "ACTIVE" | "PAST";

export interface AdminReservationsPanelProps {
  open: boolean;
  onClose: () => void;
}

function getStatus(r: AdminReservation, now: Date): StatusFilter {
  const start = new Date(r.startTime);
  const end = new Date(r.endTime);
  if (now < start) return "UPCOMING";
  if (now >= start && now <= end) return "ACTIVE";
  return "PAST";
}

const PAGE_SIZE = 10;

const AdminReservationsPanel: React.FC<AdminReservationsPanelProps> = ({ open, onClose }) => {
  const [rows, setRows] = useState<AdminReservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [page, setPage] = useState(0);
  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: "success" | "error" }>(
    { open: false, message: "", severity: "success" }
  );

  const fetchReservations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await API.get<AdminReservation[]>("/reservations");
      setRows(resp.data || []);
    } catch (e: unknown) {
      console.error("Failed to load reservations", e);
      const message = (e as { response?: { data?: string } ; message?: string })?.response?.data
        ?? (e as { message?: string })?.message
        ?? "Failed to load reservations";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchReservations();
    }
  }, [open, fetchReservations]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setPage(0);
  };

  const handleStatusChange = (e: SelectChangeEvent<StatusFilter>) => {
    setStatus(e.target.value as StatusFilter);
    setPage(0);
  };

  const filtered = useMemo(() => {
    const now = new Date();
    const q = query.trim().toLowerCase();
    return rows.filter(r => {
      const s = getStatus(r, now);
      if (status !== "ALL" && s !== status) return false;
      if (!q) return true;
      const userStr = `${r.user?.email || ""} ${r.user?.name || ""}`.toLowerCase();
      const spotStr = `${r.parkingSpot?.label || r.parkingSpot?.id || ""}`.toString().toLowerCase();
      return userStr.includes(q) || spotStr.includes(q) || `${r.id}`.includes(q);
    });
  }, [rows, query, status]);

  const paged = useMemo(() => {
    const start = page * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  const formatDateTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  const doForceCancel = async (id: number) => {
    if (!window.confirm(`Xác nhận hủy đặt chỗ #${id}?`)) return;
    try {
      await API.delete(`/reservations/admin/force-cancel/${id}`);
      setSnack({ open: true, message: `Đã hủy đặt chỗ #${id}`, severity: "success" });
      fetchReservations();
    } catch (e: unknown) {
      console.error("Cancel failed", e);
      const message = (e as { response?: { data?: string } ; message?: string })?.response?.data
        ?? (e as { message?: string })?.message
        ?? "Hủy thất bại";
      setSnack({ open: true, message, severity: "error" });
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle sx={{ fontWeight: 700, bgcolor: 'primary.main', color: 'common.white' }}>
        Quản lý đặt chỗ
      </DialogTitle>
      <DialogContent dividers sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', mb: 2 }}>
          <TextField
            value={query}
            onChange={handleSearchChange}
            placeholder="Tìm theo người dùng, vị trí hoặc ID"
            size="small"
            sx={{ minWidth: 280 }}
          />
          <Select value={status} size="small" onChange={handleStatusChange}>
            <MenuItem value="ALL">Tất cả</MenuItem>
            <MenuItem value="UPCOMING">Sắp tới</MenuItem>
            <MenuItem value="ACTIVE">Đang diễn ra</MenuItem>
            <MenuItem value="PAST">Đã qua</MenuItem>
          </Select>
          <Box sx={{ flex: 1 }} />
          <Button variant="outlined" onClick={fetchReservations} disabled={loading}>
            {loading ? <CircularProgress size={18} /> : "Làm mới"}
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        )}

        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Người dùng</TableCell>
                <TableCell>Vị trí</TableCell>
                <TableCell>Bắt đầu</TableCell>
                <TableCell>Kết thúc</TableCell>
                <TableCell>Trạng thái</TableCell>
                <TableCell align="right">Thao tác</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paged.map((r) => {
                const now = new Date();
                const s = getStatus(r, now);
                return (
                  <TableRow key={r.id} hover>
                    <TableCell>{r.id}</TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{r.user?.name || r.user?.email || r.user?.id}</Typography>
                      {r.user?.email && (
                        <Typography variant="caption" color="text.secondary">{r.user.email}</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>Spot {r.parkingSpot?.label ?? r.parkingSpot?.id}</Typography>
                    </TableCell>
                    <TableCell>{formatDateTime(r.startTime)}</TableCell>
                    <TableCell>{formatDateTime(r.endTime)}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={s === 'ACTIVE' ? 'Đang diễn ra' : s === 'UPCOMING' ? 'Sắp tới' : 'Đã qua'}
                        color={s === 'ACTIVE' ? 'success' : s === 'UPCOMING' ? 'info' : 'default'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Button color="error" variant="text" onClick={() => doForceCancel(r.id)}>Hủy</Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {paged.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={7}>
                    <Box sx={{ textAlign: 'center', p: 3 }}>
                      <Typography>Không có dữ liệu</Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {filtered.length} kết quả • Trang {page + 1}/{pageCount}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="outlined" disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}>Trước</Button>
            <Button variant="outlined" disabled={page + 1 >= pageCount} onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))}>Sau</Button>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Đóng</Button>
      </DialogActions>

      <Snackbar
        open={snack.open}
        autoHideDuration={3000}
        onClose={() => setSnack(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={snack.severity} onClose={() => setSnack(s => ({ ...s, open: false }))}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Dialog>
  );
};

export default AdminReservationsPanel;
