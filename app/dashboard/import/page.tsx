'use client'

import { useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Upload, FileSpreadsheet, CheckCircle, XCircle } from 'lucide-react'
import * as XLSX from 'xlsx'
import toast from 'react-hot-toast'

interface MemberData {
  phone: string
  full_name: string
  city: string
  gotra: string
}

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [previewData, setPreviewData] = useState<MemberData[]>([])
  const [importing, setImporting] = useState(false)
  const [importResults, setImportResults] = useState<{
    success: number
    failed: number
    errors: string[]
  } | null>(null)
  const supabase = createBrowserClient()

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFile(file)
    setImportResults(null)

    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json<any>(worksheet)

      const members: MemberData[] = jsonData.map((row: any) => ({
        phone: String(row.Phone || row.phone || '').trim(),
        full_name: String(row['Full Name'] || row.full_name || row.name || '').trim(),
        city: String(row.City || row.city || '').trim(),
        gotra: String(row.Gotra || row.gotra || '').trim(),
      }))

      setPreviewData(members.filter(m => m.phone))
      toast.success(`Loaded ${members.length} records`)
    } catch (error) {
      toast.error('Failed to parse file')
      console.error(error)
    }
  }

  const importMembers = async () => {
    if (previewData.length === 0) {
      toast.error('No data to import')
      return
    }

    setImporting(true)
    let successCount = 0
    let failedCount = 0
    const errors: string[] = []

    try {
      for (const member of previewData) {
        try {
          // Insert into approved_members
          const { error: insertError } = await supabase
            .from('approved_members')
            .insert({
              phone: member.phone,
              full_name: member.full_name,
              city: member.city,
              gotra: member.gotra,
            })

          if (insertError && !insertError.message.includes('duplicate')) {
            throw insertError
          }

          // Check if user exists and verify them
          const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('phone', member.phone)
            .single()

          if (existingUser) {
            await supabase
              .from('users')
              .update({ is_verified: true })
              .eq('id', existingUser.id)
          }

          successCount++
        } catch (error: any) {
          failedCount++
          errors.push(`${member.phone}: ${error.message}`)
        }
      }

      setImportResults({
        success: successCount,
        failed: failedCount,
        errors: errors.slice(0, 10), // Show first 10 errors
      })

      toast.success(`Import complete: ${successCount} successful, ${failedCount} failed`)
    } catch (error) {
      toast.error('Import failed')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Import Approved Members</h1>
        <p className="text-gray-600 mt-1">Upload Excel file with approved member data</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload File</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-4">
              Excel file should have columns: <strong>Phone, Full Name, City, Gotra</strong>
            </p>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <FileSpreadsheet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload">
                <Button asChild>
                  <span>
                    <Upload className="w-4 h-4 mr-2" />
                    Choose File
                  </span>
                </Button>
              </label>
              {file && (
                <p className="text-sm text-gray-600 mt-2">
                  Selected: {file.name}
                </p>
              )}
            </div>
          </div>

          {previewData.length > 0 && (
            <>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="font-medium">Preview: {previewData.length} records loaded</p>
              </div>

              <div className="overflow-x-auto max-h-96 border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">Phone</th>
                      <th className="px-4 py-2 text-left">Full Name</th>
                      <th className="px-4 py-2 text-left">City</th>
                      <th className="px-4 py-2 text-left">Gotra</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {previewData.slice(0, 10).map((member, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2">{member.phone}</td>
                        <td className="px-4 py-2">{member.full_name}</td>
                        <td className="px-4 py-2">{member.city}</td>
                        <td className="px-4 py-2">{member.gotra}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {previewData.length > 10 && (
                  <p className="text-center text-sm text-gray-500 py-2">
                    ...and {previewData.length - 10} more records
                  </p>
                )}
              </div>

              <Button
                onClick={importMembers}
                disabled={importing}
                className="w-full"
                size="lg"
              >
                {importing ? 'Importing...' : 'Import All Members'}
              </Button>
            </>
          )}

          {importResults && (
            <Card>
              <CardHeader>
                <CardTitle>Import Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="font-semibold text-green-900">
                        Success: {importResults.success}
                      </span>
                    </div>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <XCircle className="w-5 h-5 text-red-600" />
                      <span className="font-semibold text-red-900">
                        Failed: {importResults.failed}
                      </span>
                    </div>
                  </div>
                </div>

                {importResults.errors.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Errors:</h4>
                    <ul className="text-sm text-red-600 space-y-1">
                      {importResults.errors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  )
}