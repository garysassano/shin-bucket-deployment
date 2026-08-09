use serde_json::{Map, Value};

pub(crate) struct ResponsePayload {
    pub(crate) physical_resource_id: String,
    pub(crate) reason: Option<String>,
    pub(crate) data: Map<String, Value>,
}
