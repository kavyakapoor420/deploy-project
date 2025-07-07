
import  { useState } from "react";
import { Card, CardContent } from '../Components/ui/card'
import { Input } from '../Components/ui/input'
import { Badge } from '../Components/ui/badge'
import { Button } from '../Components/ui/button'
import { Search } from "lucide-react";


const samplePolices=[
    {
        title: "Widow Pension Scheme - Rajasthan",
        tags: ["Pension", "Rajasthan", "Women"],
        summary: "Financial assistance to widows above 18 years in Rajasthan.",
        link: "#"
      },
      {
        title: "PM Kisan Samman Nidhi Yojana",
        tags: ["Farmer", "Income Support", "PM-KISAN"],
        summary: "Rs 6000 annual support to small and marginal farmers in 3 installments.",
        link: "#"
      },
      {
        title: "Ayushman Bharat Yojana",
        tags: ["Health", "Insurance", "BPL"],
        summary: "Free medical treatment up to Rs 5 lakhs per family per year.",
        link: "#"
        },
]

const KnowledgeBasePage = () => {

    const [query,setQuery]=useState("")
   
    const filteredPolicies = samplePolices.filter((policy) =>
        policy.title.toLowerCase().includes(query.toLowerCase()) ||
        policy.summary.toLowerCase().includes(query.toLowerCase()) ||
        policy.tags.some((tag) => tag.toLowerCase().includes(query.toLowerCase()))
    );

    return(
        <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">📚 Knowledge Base: Verified Schemes & Policies</h1>
  
        <div className="relative mb-6">
          <Search className="absolute left-3 top-3 text-gray-400" size={18} />
          <Input
            type="text"
            placeholder="Search schemes by keyword, state, or tag..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10"
          />
        </div>
  
        <div className="grid gap-4">
          {filteredPolicies.map((policy, idx) => (
            <Card key={idx} className="border hover:shadow-md transition">
              <CardContent className="p-4">
                <h2 className="text-lg font-semibold mb-1">{policy.title}</h2>
                <p className="text-sm text-gray-600 mb-2">{policy.summary}</p>
                <div className="flex flex-wrap gap-2 mb-2">
                  {policy.tags.map((tag, i) => (
                    <Badge key={i} variant="outline">{tag}</Badge>
                  ))}
                </div>
                <a className="text-blue-600 px-0 hover:underline" href={policy.link}>
                  View Full Details →
                </a>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
}

export default KnowledgeBasePage;