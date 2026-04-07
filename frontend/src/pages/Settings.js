import { useEffect, useState } from 'react';
import axios from 'axios';
import LayoutWithSidebar from '../components/LayoutWithSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Settings as SettingsIcon, Plus, Trash2, Save, Loader2, Clock, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Settings = () => {
  // System Settings
  const [systemSettings, setSystemSettings] = useState({
    minimum_payment_percentage: 20,
    birthday_mandatory: false
  });

  // Branch Thresholds
  const [outlets, setOutlets] = useState([]);
  const [branchThresholds, setBranchThresholds] = useState({});
  const [selectedOutlet, setSelectedOutlet] = useState('');
  const [outletThreshold, setOutletThreshold] = useState(20);

  // Flavours
  const [flavours, setFlavours] = useState([]);
  const [newFlavour, setNewFlavour] = useState('');

  // Occasions
  const [occasions, setOccasions] = useState([]);
  const [newOccasion, setNewOccasion] = useState('');

  // Time Slots
  const [timeSlots, setTimeSlots] = useState([]);
  const [slotStartHour, setSlotStartHour] = useState('10');
  const [slotStartMinute, setSlotStartMinute] = useState('00');
  const [slotStartPeriod, setSlotStartPeriod] = useState('AM');
  const [slotEndHour, setSlotEndHour] = useState('12');
  const [slotEndMinute, setSlotEndMinute] = useState('00');
  const [slotEndPeriod, setSlotEndPeriod] = useState('PM');

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    fetchAllSettings();
  }, []);

  const fetchAllSettings = async () => {
    const token = localStorage.getItem('token');
    try {
      // Fetch system settings
      const sysRes = await axios.get(`${API}/system-settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSystemSettings(sysRes.data);

      // Fetch outlets
      const outletsRes = await axios.get(`${API}/outlets`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOutlets(outletsRes.data);

      // Fetch flavours
      const flavoursRes = await axios.get(`${API}/flavours`);
      setFlavours(flavoursRes.data);

      // Fetch occasions
      const occasionsRes = await axios.get(`${API}/occasions`);
      setOccasions(occasionsRes.data);

      // Fetch time slots
      const slotsRes = await axios.get(`${API}/time-slots`);
      setTimeSlots(slotsRes.data);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      setError('Failed to load settings');
    }
  };

  const showSuccess = (message) => {
    setSuccess(message);
    setTimeout(() => setSuccess(''), 3000);
  };

  const showError = (message) => {
    setError(message);
    setTimeout(() => setError(''), 3000);
  };

  // ==================== SYSTEM SETTINGS ====================
  const updateSystemSettings = async () => {
    const token = localStorage.getItem('token');
    setLoading(true);
    try {
      await axios.patch(`${API}/system-settings`, systemSettings, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showSuccess('System settings updated successfully');
    } catch (error) {
      showError('Failed to update system settings');
    } finally {
      setLoading(false);
    }
  };

  // ==================== BRANCH THRESHOLDS ====================
  const setBranchThreshold = async () => {
    if (!selectedOutlet) {
      showError('Please select an outlet');
      return;
    }

    const token = localStorage.getItem('token');
    setLoading(true);
    try {
      await axios.post(`${API}/branch-payment-threshold`, {
        outlet_id: selectedOutlet,
        minimum_payment_percentage: outletThreshold
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showSuccess('Branch threshold updated successfully');
      setBranchThresholds({
        ...branchThresholds,
        [selectedOutlet]: outletThreshold
      });
    } catch (error) {
      showError('Failed to update branch threshold');
    } finally {
      setLoading(false);
    }
  };

  // ==================== FLAVOURS ====================
  const addFlavour = async () => {
    if (!newFlavour.trim()) {
      showError('Please enter flavour name');
      return;
    }

    const token = localStorage.getItem('token');
    setLoading(true);
    try {
      await axios.post(`${API}/flavours`, {
        name: newFlavour
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNewFlavour('');
      fetchAllSettings();
      showSuccess('Flavour added successfully');
    } catch (error) {
      showError(error.response?.data?.detail || 'Failed to add flavour');
    } finally {
      setLoading(false);
    }
  };

  const deleteFlavour = async (flavourId) => {
    const token = localStorage.getItem('token');
    try {
      await axios.delete(`${API}/flavours/${flavourId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchAllSettings();
      showSuccess('Flavour deleted successfully');
    } catch (error) {
      showError('Failed to delete flavour');
    }
  };

  // ==================== OCCASIONS ====================
  const addOccasion = async () => {
    if (!newOccasion.trim()) {
      showError('Please enter occasion name');
      return;
    }

    const token = localStorage.getItem('token');
    setLoading(true);
    try {
      await axios.post(`${API}/occasions`, {
        name: newOccasion
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNewOccasion('');
      fetchAllSettings();
      showSuccess('Occasion added successfully');
    } catch (error) {
      showError(error.response?.data?.detail || 'Failed to add occasion');
    } finally {
      setLoading(false);
    }
  };

  const deleteOccasion = async (occasionId) => {
    const token = localStorage.getItem('token');
    try {
      await axios.delete(`${API}/occasions/${occasionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchAllSettings();
      showSuccess('Occasion deleted successfully');
    } catch (error) {
      showError('Failed to delete occasion');
    }
  };

  // ==================== TIME SLOTS ====================
  const addTimeSlot = async () => {
    const formattedSlot = `${slotStartHour}:${slotStartMinute} ${slotStartPeriod} - ${slotEndHour}:${slotEndMinute} ${slotEndPeriod}`;

    const token = localStorage.getItem('token');
    setLoading(true);
    try {
      await axios.post(`${API}/time-slots`, {
        time_slot: formattedSlot
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchAllSettings();
      showSuccess('Time slot added successfully');
    } catch (error) {
      showError(error.response?.data?.detail || 'Failed to add time slot');
    } finally {
      setLoading(false);
    }
  };

  const deleteTimeSlot = async (slotId) => {
    const token = localStorage.getItem('token');
    try {
      await axios.delete(`${API}/time-slots/${slotId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchAllSettings();
      showSuccess('Time slot deleted successfully');
    } catch (error) {
      showError('Failed to delete time slot');
    }
  };

  const handleResetSystem = async () => {
    if (resetConfirmText !== 'RESET') return;
    const token = localStorage.getItem('token');
    setResetting(true);
    try {
      const res = await axios.post(`${API}/system-reset`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setResetDialogOpen(false);
      setResetConfirmText('');
      showSuccess('System reset successful! All data cleared except super admin. Reloading...');
      // Reload page after short delay to refresh all data
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      console.error('Reset error:', err);
      showError(err.response?.data?.detail || 'Failed to reset system. Check console for details.');
    } finally {
      setResetting(false);
    }
  };

  return (
    <LayoutWithSidebar>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-3xl font-bold" style={{ color: '#e92587' }}>Settings</h2>
          <p className="text-gray-600 mt-1">Configure system settings and preferences</p>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <Alert className="bg-green-50 border-green-200">
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}
        {error && (
          <Alert className="bg-red-50 border-red-200">
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {/* SECTION 1: System Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <SettingsIcon className="mr-2 h-5 w-5" style={{ color: '#e92587' }} />
              System Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Global Payment Threshold */}
            <div className="space-y-2">
              <Label>Global Minimum Payment Percentage (%)</Label>
              <div className="flex gap-4 items-center">
                <Input
                  type="number"
                  value={systemSettings.minimum_payment_percentage}
                  onChange={(e) => setSystemSettings({
                    ...systemSettings,
                    minimum_payment_percentage: parseFloat(e.target.value)
                  })}
                  className="max-w-xs"
                  min="0"
                  max="100"
                />
                <span className="text-sm text-gray-600">
                  Orders need this % payment to move from Pending to Manage Orders
                </span>
              </div>
            </div>

            {/* Birthday Mandatory Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Birthday Field</Label>
                <p className="text-sm text-gray-600">
                  Make birthday field mandatory when creating orders
                </p>
              </div>
              <Switch
                checked={systemSettings.birthday_mandatory}
                onCheckedChange={(checked) => setSystemSettings({
                  ...systemSettings,
                  birthday_mandatory: checked
                })}
              />
            </div>

            <Button
              onClick={updateSystemSettings}
              disabled={loading}
              className="text-white"
              style={{ backgroundColor: '#e92587' }}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save System Settings
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* SECTION 2: Branch Payment Thresholds */}
        <Card>
          <CardHeader>
            <CardTitle>Branch-Specific Payment Thresholds</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Set different payment thresholds for specific branches (overrides global setting)
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Select Branch</Label>
                <Select value={selectedOutlet} onValueChange={setSelectedOutlet}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {outlets.map((outlet) => (
                      <SelectItem key={outlet.id} value={outlet.id}>
                        {outlet.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Threshold (%)</Label>
                <Input
                  type="number"
                  value={outletThreshold}
                  onChange={(e) => setOutletThreshold(parseFloat(e.target.value))}
                  min="0"
                  max="100"
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={setBranchThreshold}
                  disabled={loading}
                  className="w-full text-white"
                  style={{ backgroundColor: '#e92587' }}
                >
                  Set Threshold
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SECTION 3: Cake Flavours */}
        <Card>
          <CardHeader>
            <CardTitle>Cake Flavours</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Input
                placeholder="Enter flavour name (e.g., Chocolate, Vanilla)"
                value={newFlavour}
                onChange={(e) => setNewFlavour(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addFlavour()}
              />
              <Button
                onClick={addFlavour}
                disabled={loading}
                className="text-white whitespace-nowrap"
                style={{ backgroundColor: '#e92587' }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Flavour
              </Button>
            </div>

            {flavours.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Flavour Name</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {flavours.map((flavour) => (
                    <TableRow key={flavour.id}>
                      <TableCell>{flavour.name}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteFlavour(flavour.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No flavours added yet</p>
            )}
          </CardContent>
        </Card>

        {/* SECTION 4: Occasions */}
        <Card>
          <CardHeader>
            <CardTitle>Occasions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Input
                placeholder="Enter occasion name (e.g., Birthday, Anniversary)"
                value={newOccasion}
                onChange={(e) => setNewOccasion(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addOccasion()}
              />
              <Button
                onClick={addOccasion}
                disabled={loading}
                className="text-white whitespace-nowrap"
                style={{ backgroundColor: '#e92587' }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Occasion
              </Button>
            </div>

            {occasions.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Occasion Name</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {occasions.map((occasion) => (
                    <TableRow key={occasion.id}>
                      <TableCell>{occasion.name}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteOccasion(occasion.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No occasions added yet</p>
            )}
          </CardContent>
        </Card>

        {/* SECTION 5: Delivery Time Slots */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Delivery Time Slots
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">Start Time</Label>
                  <div className="flex gap-1">
                    <Select value={slotStartHour} onValueChange={setSlotStartHour}>
                      <SelectTrigger className="w-[70px]" data-testid="start-hour-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(h => (
                          <SelectItem key={h} value={h}>{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="flex items-center font-bold">:</span>
                    <Select value={slotStartMinute} onValueChange={setSlotStartMinute}>
                      <SelectTrigger className="w-[70px]" data-testid="start-minute-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {['00', '15', '30', '45'].map(m => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={slotStartPeriod} onValueChange={setSlotStartPeriod}>
                      <SelectTrigger className="w-[70px]" data-testid="start-period-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AM">AM</SelectItem>
                        <SelectItem value="PM">PM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <span className="flex items-center pb-1 text-gray-400 font-medium">to</span>

                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">End Time</Label>
                  <div className="flex gap-1">
                    <Select value={slotEndHour} onValueChange={setSlotEndHour}>
                      <SelectTrigger className="w-[70px]" data-testid="end-hour-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(h => (
                          <SelectItem key={h} value={h}>{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="flex items-center font-bold">:</span>
                    <Select value={slotEndMinute} onValueChange={setSlotEndMinute}>
                      <SelectTrigger className="w-[70px]" data-testid="end-minute-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {['00', '15', '30', '45'].map(m => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={slotEndPeriod} onValueChange={setSlotEndPeriod}>
                      <SelectTrigger className="w-[70px]" data-testid="end-period-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AM">AM</SelectItem>
                        <SelectItem value="PM">PM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  onClick={addTimeSlot}
                  disabled={loading}
                  className="text-white whitespace-nowrap"
                  style={{ backgroundColor: '#e92587' }}
                  data-testid="add-time-slot-btn"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Time Slot
                </Button>
              </div>
              <p className="text-xs text-gray-400">
                Preview: {slotStartHour}:{slotStartMinute} {slotStartPeriod} - {slotEndHour}:{slotEndMinute} {slotEndPeriod}
              </p>
            </div>

            {timeSlots.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time Slot</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {timeSlots.map((slot) => (
                    <TableRow key={slot.id}>
                      <TableCell>{slot.time_slot}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteTimeSlot(slot.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No time slots added yet</p>
            )}
          </CardContent>
        </Card>

        {/* SECTION 6: Reset System (Danger Zone) */}
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Danger Zone
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Reset System</p>
                <p className="text-sm text-gray-500">Permanently delete all orders, payments, users (except super admin), outlets, zones, and all other data.</p>
              </div>
              <Button
                variant="destructive"
                onClick={() => setResetDialogOpen(true)}
                data-testid="reset-system-btn"
              >
                <AlertTriangle className="mr-2 h-4 w-4" />
                Reset System
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Reset Confirmation Dialog */}
        <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-red-600 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Reset Entire System
              </DialogTitle>
              <DialogDescription>
                This action will permanently delete ALL data including orders, payments, customers, outlets, zones, users, flavours, occasions, and time slots. Only the super admin account will be preserved.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <p className="text-sm font-medium">Type <span className="font-bold text-red-600">RESET</span> to confirm:</p>
              <Input
                value={resetConfirmText}
                onChange={(e) => setResetConfirmText(e.target.value)}
                placeholder="Type RESET to confirm"
                data-testid="reset-confirm-input"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setResetDialogOpen(false); setResetConfirmText(''); }}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleResetSystem}
                disabled={resetConfirmText !== 'RESET' || resetting}
                data-testid="reset-confirm-btn"
              >
                {resetting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <AlertTriangle className="mr-2 h-4 w-4" />}
                {resetting ? 'Resetting...' : 'Reset Everything'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </LayoutWithSidebar>
  );
};

export default Settings;
