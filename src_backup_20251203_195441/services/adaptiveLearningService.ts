class AdaptiveLearningService {
  async setPriority(topic: string, source: string, score: number) {}
  async getPriorities(source_hint: string) { return []; }
}
export default new AdaptiveLearningService();
