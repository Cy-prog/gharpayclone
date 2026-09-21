import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Copy, IndianRupee } from "lucide-react";
import { finalizeBooking } from "@/lib/operational-engine/actions";
import type { OperationalLead } from "@/lib/operational-engine/types";

export interface BookingDetails {
  monthlyRent: number; // e.g. 15000
  securityDeposit: number; // e.g. 30000
  tokenAmount: number; // e.g. 5000
  paymentMode: string;
  transactionRef: string;
}

interface Props {
  lead: OperationalLead;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function FinalizeBookingDialog({ lead, open, onOpenChange, onSuccess }: Props) {
  const [propertyName, setPropertyName] = useState(
    lead.selectedPropertyName || "Gharpayy Emerald Suites",
  );
  const [roomNumber, setRoomNumber] = useState(lead.selectedPropertyId || "302-B");
  const [monthlyRent, setMonthlyRent] = useState<number>(lead.budget || 15000);
  const [securityDeposit, setSecurityDeposit] = useState<number>((lead.budget || 15000) * 2);
  const [tokenAmount, setTokenAmount] = useState<number>(5000);
  const [paymentMode, setPaymentMode] = useState<string>("UPI");
  const [transactionRef, setTransactionRef] = useState<string>(
    () => `UPI-${Math.floor(100000 + Math.random() * 900000)}`,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receiptData, setReceiptData] = useState<{
    bookingId: string;
    token: string;
    leadName: string;
    phone: string;
    property: string;
    room: string;
    monthlyRent: number;
    securityDeposit: number;
    tokenAmount: number;
    amountPaid: number;
    paymentMode: string;
    ref: string;
    date: string;
  } | null>(null);

  const handleConfirm = async () => {
    if (!propertyName.trim()) {
      toast.error("Please enter the property name");
      return;
    }
    if (!roomNumber.trim()) {
      toast.error("Please enter the room/bed number");
      return;
    }
    if (tokenAmount <= 0) {
      toast.error("Please enter a valid booking token amount");
      return;
    }
    if (monthlyRent <= 0) {
      toast.error("Please enter a valid monthly rent");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await finalizeBooking({
        leadId: lead.id,
        tenantName: lead.name,
        tenantPhone: lead.phone,
        propertyId: lead.selectedPropertyId || "prop-1",
        propertyName,
        roomTypeId: lead.sharingType.toLowerCase(),
        roomOrBedLabel: roomNumber,
        monthlyRent,
        securityDeposit,
        tokenAmount,
        paymentMode,
        transactionRef,
        agreementStartDate: lead.moveInDate || new Date().toISOString().slice(0, 10),
        token: transactionRef,
        operatorName: lead.currentHandlerName || "Rahul",
      });

      if (res.ok) {
        toast.success(`Booking confirmed for ${lead.name}!`, {
          description: `₹${tokenAmount.toLocaleString("en-IN")} token registered with ref ${transactionRef}`,
        });
        setReceiptData({
          bookingId: res.booking?.id || `GP-BK-${Date.now().toString().slice(-4)}`,
          token: res.booking?.token || "BK" + Math.floor(1000 + Math.random() * 9000),
          leadName: lead.name,
          phone: lead.phone,
          property: propertyName,
          room: roomNumber,
          monthlyRent,
          securityDeposit,
          tokenAmount,
          amountPaid: tokenAmount,
          paymentMode,
          ref: transactionRef,
          date: new Date().toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          }),
        });
        onSuccess?.();
      } else {
        toast.error("Failed to finalize booking", { description: res.error });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyWhatsAppMessage = async () => {
    if (!receiptData) return;
    const msg = [
      `🎉 *GHARPAYY OFFICIAL BOOKING RECEIPT* 🎉`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `*Tenant Name:* ${receiptData.leadName}`,
      `*Phone:* ${receiptData.phone}`,
      `*Booking ID:* ${receiptData.bookingId}`,
      `*Property:* ${receiptData.property}`,
      `*Room / Bed:* ${receiptData.room}`,
      `*Booking Token Paid:* ₹${receiptData.tokenAmount.toLocaleString("en-IN")}`,
      `*Agreed Monthly Rent:* ₹${receiptData.monthlyRent.toLocaleString("en-IN")}`,
      `*Security Deposit:* ₹${receiptData.securityDeposit.toLocaleString("en-IN")}`,
      `*Payment Mode:* ${receiptData.paymentMode} (Ref: ${receiptData.ref})`,
      `*Date:* ${receiptData.date}`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `Your room has been reserved! Our onboarding team will contact you for KYC & agreement verification before move-in.`,
      `Welcome to the Gharpayy community! 🏡`,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(msg);
      toast.success("WhatsApp receipt copied to clipboard!");
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        {!receiptData ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                Confirm Booking & Issue Receipt
              </DialogTitle>
              <DialogDescription className="text-xs">
                Finalize payment commitment for{" "}
                <span className="font-semibold text-foreground">{lead.name}</span> ({lead.phone}).
                This records the advance token payment, allocates room inventory, and confirms booking.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="prop-name" className="text-[11px]">
                    Property Name
                  </Label>
                  <Input
                    id="prop-name"
                    value={propertyName}
                    onChange={(e) => setPropertyName(e.target.value)}
                    className="h-8 text-xs"
                    placeholder="e.g. Gharpayy Emerald"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="room-no" className="text-[11px]">
                    Room / Bed No.
                  </Label>
                  <Input
                    id="room-no"
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    className="h-8 text-xs"
                    placeholder="e.g. 302-B"
                  />
                </div>
              </div>

              {/* Booking Financial Structure */}
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-2.5 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-semibold text-primary">
                  <span>Financial Breakdown</span>
                  <Badge variant="outline" className="text-[10px] bg-background text-emerald-700">
                    Advance Token Deposit
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label
                      htmlFor="token-amount"
                      className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400"
                    >
                      Token Paid (₹)
                    </Label>
                    <div className="relative">
                      <IndianRupee className="absolute left-2 top-2 h-3.5 w-3.5 text-emerald-600" />
                      <Input
                        id="token-amount"
                        type="number"
                        value={tokenAmount}
                        onChange={(e) => setTokenAmount(Number(e.target.value))}
                        className="h-8 pl-7 text-xs font-bold text-emerald-700 dark:text-emerald-400"
                        placeholder="5000"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="monthly-rent" className="text-[10px] font-medium">
                      Monthly Rent (₹)
                    </Label>
                    <div className="relative">
                      <IndianRupee className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        id="monthly-rent"
                        type="number"
                        value={monthlyRent}
                        onChange={(e) => {
                          const r = Number(e.target.value);
                          setMonthlyRent(r);
                          setSecurityDeposit(r * 2);
                        }}
                        className="h-8 pl-7 text-xs font-semibold"
                        placeholder="15000"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="security-deposit" className="text-[10px] font-medium">
                      Deposit (₹)
                    </Label>
                    <div className="relative">
                      <IndianRupee className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        id="security-deposit"
                        type="number"
                        value={securityDeposit}
                        onChange={(e) => setSecurityDeposit(Number(e.target.value))}
                        className="h-8 pl-7 text-xs"
                        placeholder="30000"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="pay-mode" className="text-[11px]">
                    Payment Mode
                  </Label>
                  <select
                    id="pay-mode"
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                  >
                    <option value="UPI">UPI (PhonePe / GPay / Paytm)</option>
                    <option value="Bank Transfer">Bank Transfer / NEFT</option>
                    <option value="Card">Debit / Credit Card</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="tx-ref" className="text-[11px]">
                    Transaction UTR / Ref
                  </Label>
                  <Input
                    id="tx-ref"
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    className="h-8 text-xs font-mono"
                    placeholder="e.g. 429381726351"
                  />
                </div>
              </div>

              <div className="rounded-md border bg-muted/40 p-2 space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">Move-in Date:</span>
                  <span className="font-semibold">{lead.moveInDate || "Immediate"}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">Sharing Type:</span>
                  <span className="font-semibold">{lead.sharingType}</span>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                onClick={handleConfirm}
                disabled={isSubmitting}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                {isSubmitting ? "Confirming..." : "Confirm Booking & Issue Receipt"}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
                Booking Confirmed & Receipt Issued!
              </DialogTitle>
              <DialogDescription className="text-xs">
                The booking has been successfully recorded in Gharpayy operational engine and
                Supabase.
              </DialogDescription>
            </DialogHeader>

            {/* Official Printable Receipt Card */}
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 p-3.5 space-y-3 text-xs">
              <div className="flex items-center justify-between border-b pb-2">
                <div>
                  <h3 className="font-bold text-sm tracking-tight text-foreground">
                    GHARPAYY RESIDENCY
                  </h3>
                  <p className="text-[10px] text-muted-foreground">Official Booking Confirmation</p>
                </div>
                <Badge className="bg-emerald-600 text-white text-[10px]">PAID & RESERVED</Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-muted-foreground block text-[10px]">TENANT NAME</span>
                  <span className="font-semibold">{receiptData.leadName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">PHONE</span>
                  <span className="font-semibold">{receiptData.phone}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">PROPERTY</span>
                  <span className="font-semibold">{receiptData.property}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">ROOM ALLOCATED</span>
                  <span className="font-semibold">{receiptData.room}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">TOKEN RECEIVED</span>
                  <span className="font-bold text-emerald-600 text-xs">
                    ₹{receiptData.tokenAmount.toLocaleString("en-IN")}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">MONTHLY RENT</span>
                  <span className="font-semibold">
                    ₹{receiptData.monthlyRent.toLocaleString("en-IN")}/mo
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">SECURITY DEPOSIT</span>
                  <span className="font-medium">
                    ₹{receiptData.securityDeposit.toLocaleString("en-IN")}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">PAYMENT MODE</span>
                  <span className="font-medium">
                    {receiptData.paymentMode} ({receiptData.ref})
                  </span>
                </div>
              </div>

              <div className="border-t pt-2 text-[10px] text-muted-foreground flex justify-between">
                <span>Receipt Date: {receiptData.date}</span>
                <span>Ref: {receiptData.bookingId}</span>
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1 text-xs"
                onClick={copyWhatsAppMessage}
              >
                <Copy className="h-3.5 w-3.5" />
                Copy WhatsApp Receipt
              </Button>
              <Button
                size="sm"
                className="gap-1 text-xs"
                onClick={() => {
                  onOpenChange(false);
                  setReceiptData(null);
                }}
              >
                Done
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
