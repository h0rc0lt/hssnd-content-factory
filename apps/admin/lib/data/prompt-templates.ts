/**
 * Prompt template catalog — LoRA reference-image generation.
 *
 * Static, not a DB table (see migration `add_lora_pipeline_tables` review —
 * only character_uploads / lora_models / generation_jobs are tables; these
 * 28 templates are code because they're shared config, not per-character
 * data). Grouped by the taxonomy of the existing reference folder structure.
 * Each `key` is stable and referenced by `generation_jobs.prompt_key` — do
 * not rename a key without a data migration.
 *
 * `{trigger}` is replaced with the character's LoRA trigger word
 * (`lora_models.trigger_word`) at submit time.
 */

export type PromptTemplateCategory =
  | "base_turnaround"
  | "facial_expression"
  | "full_body_pose"
  | "detail_shot"
  | "portrait";

export interface PromptTemplate {
  key: string;
  category: PromptTemplateCategory;
  label: string;
  prompt: string;
}

export const PROMPT_TEMPLATE_CATEGORY_LABEL: Record<PromptTemplateCategory, string> = {
  base_turnaround: "Base — grey background turnaround",
  facial_expression: "Close-up facial expressions",
  full_body_pose: "Full-body poses",
  detail_shot: "Detail shots",
  portrait: "Portrait variations",
};

export const PROMPT_TEMPLATES: PromptTemplate[] = [
  // -- base_turnaround (8) --------------------------------------------------
  {
    key: "base_front",
    category: "base_turnaround",
    label: "Front view",
    prompt:
      "{trigger}, full body turnaround, facing camera directly, neutral standing pose, flat grey studio background, even studio lighting, high detail",
  },
  {
    key: "base_three_quarter_left",
    category: "base_turnaround",
    label: "3/4 left",
    prompt:
      "{trigger}, full body turnaround, body angled three-quarters to the left, neutral standing pose, flat grey studio background, even studio lighting, high detail",
  },
  {
    key: "base_profile_left",
    category: "base_turnaround",
    label: "Left profile",
    prompt:
      "{trigger}, full body turnaround, left side profile view, neutral standing pose, flat grey studio background, even studio lighting, high detail",
  },
  {
    key: "base_back",
    category: "base_turnaround",
    label: "Back view",
    prompt:
      "{trigger}, full body turnaround, back facing camera, neutral standing pose, flat grey studio background, even studio lighting, high detail",
  },
  {
    key: "base_three_quarter_right",
    category: "base_turnaround",
    label: "3/4 right",
    prompt:
      "{trigger}, full body turnaround, body angled three-quarters to the right, neutral standing pose, flat grey studio background, even studio lighting, high detail",
  },
  {
    key: "base_profile_right",
    category: "base_turnaround",
    label: "Right profile",
    prompt:
      "{trigger}, full body turnaround, right side profile view, neutral standing pose, flat grey studio background, even studio lighting, high detail",
  },
  {
    key: "base_looking_up",
    category: "base_turnaround",
    label: "Looking up",
    prompt:
      "{trigger}, full body turnaround, facing camera, chin raised looking slightly upward, flat grey studio background, even studio lighting, high detail",
  },
  {
    key: "base_looking_down",
    category: "base_turnaround",
    label: "Looking down",
    prompt:
      "{trigger}, full body turnaround, facing camera, chin lowered looking slightly downward, flat grey studio background, even studio lighting, high detail",
  },

  // -- facial_expression (6) -------------------------------------------------
  {
    key: "expression_neutral",
    category: "facial_expression",
    label: "Neutral",
    prompt:
      "{trigger}, extreme close-up on face, neutral calm expression, sharp focus on eyes, flat grey studio background, even studio lighting",
  },
  {
    key: "expression_smiling",
    category: "facial_expression",
    label: "Smiling",
    prompt:
      "{trigger}, extreme close-up on face, warm genuine smile, sharp focus on eyes, flat grey studio background, even studio lighting",
  },
  {
    key: "expression_laughing",
    category: "facial_expression",
    label: "Laughing",
    prompt:
      "{trigger}, extreme close-up on face, mid-laugh candid expression, sharp focus on eyes, flat grey studio background, even studio lighting",
  },
  {
    key: "expression_serious",
    category: "facial_expression",
    label: "Serious",
    prompt:
      "{trigger}, extreme close-up on face, serious focused expression, sharp focus on eyes, flat grey studio background, even studio lighting",
  },
  {
    key: "expression_surprised",
    category: "facial_expression",
    label: "Surprised",
    prompt:
      "{trigger}, extreme close-up on face, surprised wide-eyed expression, sharp focus on eyes, flat grey studio background, even studio lighting",
  },
  {
    key: "expression_thoughtful",
    category: "facial_expression",
    label: "Thoughtful",
    prompt:
      "{trigger}, extreme close-up on face, thoughtful contemplative expression, sharp focus on eyes, flat grey studio background, even studio lighting",
  },

  // -- full_body_pose (6) ------------------------------------------------------
  {
    key: "pose_standing_relaxed",
    category: "full_body_pose",
    label: "Standing relaxed",
    prompt:
      "{trigger}, full body shot, relaxed standing pose, weight on one leg, arms at sides, flat grey studio background, even studio lighting",
  },
  {
    key: "pose_walking",
    category: "full_body_pose",
    label: "Walking",
    prompt:
      "{trigger}, full body shot, mid-stride walking pose, natural motion, flat grey studio background, even studio lighting",
  },
  {
    key: "pose_sitting",
    category: "full_body_pose",
    label: "Sitting",
    prompt:
      "{trigger}, full body shot, seated pose on a simple stool, relaxed posture, flat grey studio background, even studio lighting",
  },
  {
    key: "pose_arms_crossed",
    category: "full_body_pose",
    label: "Arms crossed",
    prompt:
      "{trigger}, full body shot, standing pose with arms crossed, confident posture, flat grey studio background, even studio lighting",
  },
  {
    key: "pose_hands_on_hips",
    category: "full_body_pose",
    label: "Hands on hips",
    prompt:
      "{trigger}, full body shot, standing pose with hands on hips, confident posture, flat grey studio background, even studio lighting",
  },
  {
    key: "pose_dynamic_action",
    category: "full_body_pose",
    label: "Dynamic action",
    prompt:
      "{trigger}, full body shot, dynamic mid-action pose, sense of movement and energy, flat grey studio background, even studio lighting",
  },

  // -- detail_shot (4) ----------------------------------------------------------
  {
    key: "detail_hands",
    category: "detail_shot",
    label: "Hands close-up",
    prompt:
      "{trigger}, close-up detail shot of hands, natural relaxed position, sharp focus, flat grey studio background, even studio lighting",
  },
  {
    key: "detail_eyes",
    category: "detail_shot",
    label: "Eyes close-up",
    prompt:
      "{trigger}, extreme macro close-up of eyes, sharp focus on iris and lashes, flat grey studio background, even studio lighting",
  },
  {
    key: "detail_hair",
    category: "detail_shot",
    label: "Hair detail",
    prompt:
      "{trigger}, close-up detail shot of hair texture and style, sharp focus, flat grey studio background, even studio lighting",
  },
  {
    key: "detail_outfit",
    category: "detail_shot",
    label: "Outfit detail",
    prompt:
      "{trigger}, close-up detail shot of outfit and fabric texture, sharp focus, flat grey studio background, even studio lighting",
  },

  // -- portrait (4) ---------------------------------------------------------------
  {
    key: "portrait_studio",
    category: "portrait",
    label: "Studio portrait",
    prompt:
      "{trigger}, professional studio portrait, shoulders-up framing, three-point studio lighting, flat grey background",
  },
  {
    key: "portrait_outdoor_natural",
    category: "portrait",
    label: "Outdoor natural light",
    prompt:
      "{trigger}, portrait, shoulders-up framing, soft natural outdoor daylight, shallow depth of field, blurred outdoor background",
  },
  {
    key: "portrait_dramatic",
    category: "portrait",
    label: "Dramatic lighting",
    prompt:
      "{trigger}, portrait, shoulders-up framing, dramatic low-key lighting with strong shadows, dark background",
  },
  {
    key: "portrait_soft_headshot",
    category: "portrait",
    label: "Soft light headshot",
    prompt:
      "{trigger}, professional headshot, shoulders-up framing, soft diffused lighting, flat light grey background",
  },
];
