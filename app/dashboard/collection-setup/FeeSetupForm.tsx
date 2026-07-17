"use client"

import { useState } from "react"
import { createFeeSetup } from "@/app/actions/finance"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PlusCircle } from "lucide-react"

export default function FeeSetupForm({ chargeTypes, members }: { chargeTypes: any[], members: any[] }) {
  const [frequency, setFrequency] = useState("MONTHLY")
  const [hasFine, setHasFine] = useState("NO")
  const [targetType, setTargetType] = useState("ALL")
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [chargeTypeId, setChargeTypeId] = useState("") // Added state for Collection Type

  // Only active collection types can be selected when declaring a new collection.
  // Types toggled off from the "Collection Type" tab are excluded here.
  const activeChargeTypes = chargeTypes.filter((t) => t.isActive)

  const getDueDayMax = () => {
    switch (frequency) {
      case "WEEKLY": return 6;
      case "MONTHLY": return 31;
      case "QUARTERLY": return 92;
      case "HALF_YEARLY": return 184;
      case "YEARLY": return 366;
      case "NA": return 365;
      default: return 31;
    }
  }

  const handleMemberToggle = (memberId: string) => {
    setSelectedMembers(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId) 
        : [...prev, memberId]
    )
  }

  return (
    <Card className="bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 h-fit">
      <CardHeader className="border-b border-slate-100 dark:border-slate-800">
        <CardTitle>Declare New Collection</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <form action={createFeeSetup} className="space-y-4">
          
          {/* Collection Type (Full Row) - Now Controlled */}
          <div className="space-y-2">
            <Label htmlFor="name">Collection Type *</Label>
            {/* Hidden input ensures the correct ID is submitted to the server */}
            <input type="hidden" name="name" value={chargeTypeId} />
            <Select value={chargeTypeId} onValueChange={setChargeTypeId} required>
              {/* Explicitly render the Name instead of relying on SelectValue */}
              <SelectTrigger id="name" className="w-full bg-white dark:bg-slate-950">
                {chargeTypeId ? (
                  <span>{activeChargeTypes.find((t) => t.id === chargeTypeId)?.name}</span>
                ) : (
                  <span className="text-slate-400">Select Charge Type</span>
                )}
              </SelectTrigger>
              <SelectContent>
                {activeChargeTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {activeChargeTypes.length === 0 && <p className="text-xs text-red-500">Please create a Charge Type first in the tab above.</p>}
          </div>

          {/* Row 1: Amount & Effective From */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (৳) *</Label>
              <Input id="amount" name="amount" type="number" step="0.01" required placeholder="2000" className="bg-white dark:bg-slate-950" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="effectiveDate">Effective From *</Label>
              <Input id="effectiveDate" name="effectiveDate" type="date" required className="bg-white dark:bg-slate-950" />
            </div>
          </div>

          {/* Row 2: Apply To (All / Specific) */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Label>Apply To *</Label>
            <input type="hidden" name="targetType" value={targetType} />
            <input type="hidden" name="targetMemberIds" value={JSON.stringify(selectedMembers)} />
            <Select value={targetType} onValueChange={setTargetType}>
              <SelectTrigger className="w-full bg-white dark:bg-slate-950"><SelectValue /></SelectTrigger>
              <SelectContent>
                {chargeTypes.filter(t => t.isActive).map((type) => (
                  <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {targetType === "SPECIFIC" && (
              <div className="mt-2 max-h-40 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg p-3 space-y-2 bg-slate-50 dark:bg-slate-950">
                {members.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center">No active members found.</p>
                ) : (
                  members.map((m) => (
                    <div key={m.id} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`m-${m.id}`} 
                        checked={selectedMembers.includes(m.id)} 
                        onCheckedChange={() => handleMemberToggle(m.id)} 
                      />
                      <Label htmlFor={`m-${m.id}`} className="text-sm font-normal cursor-pointer">
                        {m.fullName} <span className="text-xs text-slate-400">({m.memberNo})</span>
                      </Label>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Row 3: Repeat Frequency & Due Day */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="space-y-2">
              <Label>Repeat Frequency *</Label>
              <input type="hidden" name="frequency" value={frequency} />
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger className="w-full bg-white dark:bg-slate-950"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NA">N/A (One-time)</SelectItem>
                  <SelectItem value="WEEKLY">Weekly</SelectItem>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                  <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                  <SelectItem value="HALF_YEARLY">Half-Yearly</SelectItem>
                  <SelectItem value="YEARLY">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDay">
                Due Day * 
                {frequency !== "NA" && <span className="text-xs text-slate-400 ml-1">(Max: {getDueDayMax()})</span>}
              </Label>
              <Input 
                id="dueDay" 
                name="dueDay" 
                type="number" 
                defaultValue={10} 
                required 
                min={frequency === "WEEKLY" ? 0 : 1} 
                max={getDueDayMax()} 
                placeholder={frequency === "NA" ? "e.g., 15" : `1 to ${getDueDayMax()}`} 
                className="bg-white dark:bg-slate-950" 
              />
            </div>
          </div>

          {/* Row 4: Apply Fine & Fine Amount */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="space-y-2">
              <Label className="text-red-600 dark:text-red-400">Apply Fine on Late Payment?</Label>
              <input type="hidden" name="hasFine" value={hasFine} />
              <Select value={hasFine} onValueChange={setHasFine}>
                <SelectTrigger className="w-full bg-white dark:bg-slate-950"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="YES">Yes</SelectItem>
                  <SelectItem value="NO">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fineAmount">Fine Amount (৳)</Label>
              <Input 
                id="fineAmount" 
                name="fineAmount" 
                type="number" 
                step="0.01" 
                placeholder="50" 
                disabled={hasFine !== "YES"} 
                className={`bg-white dark:bg-slate-950 ${hasFine !== "YES" ? "cursor-not-allowed opacity-50" : ""}`}
              />
            </div>
          </div>

          <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 mt-4" disabled={activeChargeTypes.length === 0}>
            <PlusCircle className="mr-2 h-4 w-4" /> Save Setup
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}