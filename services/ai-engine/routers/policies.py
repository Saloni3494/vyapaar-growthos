import logging
from fastapi import APIRouter, HTTPException, Request
from services.agents.policy_agent import get_policy, update_policy, evaluate_action, get_approvals, decide_approval

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/{merchant_id}")
async def fetch_policy(merchant_id: str):
    return get_policy(merchant_id)

@router.put("/{merchant_id}")
async def save_policy(merchant_id: str, request: Request):
    updates = await request.json()
    return update_policy(merchant_id, updates)

@router.post("/{merchant_id}/evaluate")
async def evaluate(merchant_id: str, request: Request):
    data = await request.json()
    return evaluate_action(
        merchant_id,
        action_type=data.get("action_type", "unknown"),
        title=data.get("title", "Action"),
        description=data.get("description", ""),
        payload=data.get("payload", {})
    )

@router.post("/{merchant_id}/execute")
async def execute(merchant_id: str, request: Request):
    """
    End-to-End Execution Gateway.
    Growth Plan -> Policy Gateway -> Action Agent -> Execution -> Verification
    """
    data = await request.json()
    action_type = data.get("action_type", "unknown")
    payload = data.get("payload", {})
    
    # 1. Evaluate Policy Gateway
    eval_result = evaluate_action(
        merchant_id,
        action_type=action_type,
        title=data.get("title", "Action Execution"),
        description=data.get("description", ""),
        payload=payload
    )
    
    if eval_result.get("status") == "pending_approval":
        return eval_result
        
    # 2. Execute via Action Agent (Controlled APIs)
    from services.agents.action_agent import execute_approved_action
    exec_result = await execute_approved_action(merchant_id, action_type, payload)
    
    if exec_result.get("success"):
        return {"status": "executed", "result": exec_result}
    else:
        raise HTTPException(status_code=500, detail=exec_result.get("error"))

@router.get("/{merchant_id}/approvals")
async def list_approvals(merchant_id: str, status: str = None):
    return {"approvals": get_approvals(merchant_id, status)}

@router.post("/approvals/{approval_id}/decide")
async def decide(approval_id: str, request: Request):
    data = await request.json()
    decision = data.get("decision")
    if decision not in ["approved", "rejected"]:
        raise HTTPException(status_code=400, detail="Invalid decision")
    return await decide_approval(approval_id, decision)
