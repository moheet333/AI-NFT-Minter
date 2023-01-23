import { NodeHttpTransport } from "./@improbable-eng/grpc-web-node-http-transport";
import { grpc } from "./@improbable-eng/grpc-web";
import GenerationService from "../stable diffusion/api-interfaces/gooseai/generation/generation_pb_service";
import Generation from "../stable diffusion/api-interfaces/gooseai/generation/generation_pb";
require("dotenv").config();

grpc.setDefaultTransport(NodeHttpTransport());

const imageParams = new Generation.ImageParameters();
imageParams.setWidth(512);
imageParams.setHeight(512);
imageParams.addSeed(1234);
imageParams.setSamples(1);
imageParams.setSteps(30);

const transformType = new Generation.TransformType();
transformType.setDiffusion(Generation.DiffusionSampler.SAMPLER_K_DPMPP_2M);
imageParams.setTransform(transformType);

const request = new Generation.Request();
request.setEngineId("stable-diffusion-512-v2-1");
request.setRequestedType(Generation.ArtifactType.ARTIFACT_IMAGE);
request.setClassifier(new Generation.ClassifierParameters());

const samplerParams = new Generation.SamplerParameters();
samplerParams(13);

const stepParams = new Generation.StepParameter();
const scheduleParams = new Generation.ScheduleParameters();

stepParams.setScaledStep(0);
stepParams.setSampler(samplerParams);
stepParams.setSchedule(scheduleParams);

imageParams.addParameters(stepParams);
request.setImage(imageParams);

const promptText = new Generation.Prompt();
promptText.setText(
  "A dream of a distant galaxy, by Caspar David Friedrich, matte painting trending on artstation HQ"
);

request.addPrompt(promptText);

const metadata = new grpc.Metadata();
metadata.set("Authorization", "Bearer" + process.env.API_KEY);

const generationClient = new GenerationService.GenerationServiceClient(
  "https://grpc.stability.ai",
  {}
);

const generation = generationClient.generate(request, metadata);

generation.on("data", (data) => {
  data.getArtifactsList().forEach((artifact) => {
    if (
      artifact.getType() === Generation.ArtifactType.ARTIFACT_TEXT &&
      artifact.getFinishReason() === Generation.FinishReason.FILTER
    ) {
      return console.error("Your image was filtered by NSFW classifier");
    }

    if (artifact.getType() !== Generation.ArtifactType.ARTIFACT_IMAGE) {
      return;
    }

    const base64Image = btoa(
      new Uint8Array(artifact.getBinary()).reduce(
        (data, byte) => data + String.fromCodePoint(byte),
        ""
      )
    );

    const seed = artifact.getSeed();

    displayImage({ seed, base64Image });
  });
});

generation.on("status", (status) => {
  if (status.code === 0) return;
  console.error(
    "Your image could not be generated might not have enough credits!"
  );
});

function displayImage({ seed, base64Image }) {
  const image = document.createElement("img");
  image.src = `data:image/png;base64,${base64Image}`;
  document.body.appendChild(image);
}
